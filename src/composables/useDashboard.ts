import { ref, watch } from 'vue';
import { supabase } from '../supabase';
import { useProfile } from './useProfile';

export type WidgetType =
    | 'expired'
    | 'soon'
    | 'opened'
    | 'low-stock'
    | 'inventory-chart'
    | 'location-chart'
    | 'todos'
    | 'team'
    | 'product'
    | 'shortcut'
    | 'shopping-list'
    | 'recent-activity'
    | 'finance-snapshot'
    | 'quick-add'
    | 'quick-expense';

export interface DashboardWidget {
    id: string;
    type: WidgetType;
    props?: Record<string, any>;
    colSpan?: 1 | 2; // 1 = half width, 2 = full width
}

const DEFAULT_LAYOUT: DashboardWidget[] = [
    { id: 'w-quickadd', type: 'quick-add', colSpan: 2 },
    { id: 'w1', type: 'expired', colSpan: 1 },
    { id: 'w2', type: 'soon', colSpan: 1 },
    { id: 'w-shop', type: 'shopping-list', colSpan: 1 },
    { id: 'w5', type: 'todos', colSpan: 1 },
    { id: 'w-activity', type: 'recent-activity', colSpan: 2 },
    { id: 'w-fin', type: 'finance-snapshot', colSpan: 2 },
    { id: 'w3', type: 'opened', colSpan: 1 },
    { id: 'w-low', type: 'low-stock', colSpan: 1 },
];

// Widgets that must always take the full row.
const FULL_WIDTH_TYPES = new Set<WidgetType>(['quick-add', 'recent-activity', 'team']);

const defaultColSpan = (type: WidgetType): 1 | 2 => {
    if (FULL_WIDTH_TYPES.has(type)) return 2;
    if (type === 'location-chart' || type === 'finance-snapshot') return 2;
    return 1;
};

export const isWidthLocked = (type: WidgetType) => FULL_WIDTH_TYPES.has(type);

const LOCAL_KEY = 'dashboard_layout_v1';

const layout = ref<DashboardWidget[]>([]);
let hydrated = false;
let saveTimer: ReturnType<typeof setTimeout> | null = null;

const clone = (l: DashboardWidget[]) => JSON.parse(JSON.stringify(l)) as DashboardWidget[];

const isValidLayout = (v: unknown): v is DashboardWidget[] =>
    Array.isArray(v) && v.every((w) => w && typeof w.id === 'string' && typeof w.type === 'string');

/**
 * Dashboard layout per user. Since 2.0 it lives in
 * `user_profiles.dashboard_layout` so it follows the user across devices;
 * localStorage is only a fast first paint cache (and the source for a one-time
 * migration of pre-2.0 layouts).
 */
export function useDashboard() {
    const { profile } = useProfile();

    const loadLayout = () => {
        hydrated = false;
        const remote = profile.value?.dashboard_layout;
        if (isValidLayout(remote)) {
            layout.value = clone(remote);
        } else {
            let local: unknown = null;
            try { local = JSON.parse(localStorage.getItem(LOCAL_KEY) || 'null'); } catch { /* ignore */ }
            layout.value = isValidLayout(local) ? local : clone(DEFAULT_LAYOUT);
            // First 2.0 login: carry the device layout over to the account.
            if (profile.value) persist();
        }
        hydrated = true;
    };

    const isProductPinned = (productId: string) =>
        layout.value.some(w => w.type === 'product' && w.props?.productId === productId);

    const toggleProductPin = (productId: string) => {
        if (isProductPinned(productId)) {
            layout.value = layout.value.filter(w => !(w.type === 'product' && w.props?.productId === productId));
        } else {
            layout.value.push({ id: 'w-item-' + Date.now(), type: 'product', props: { productId }, colSpan: 1 });
        }
    };

    const addWidget = (type: WidgetType, props?: Record<string, any>) => {
        layout.value.push({ id: 'w-' + Date.now(), type, props, colSpan: defaultColSpan(type) });
    };

    const removeWidget = (id: string) => {
        layout.value = layout.value.filter(w => w.id !== id);
    };

    const resetLayout = () => {
        layout.value = clone(DEFAULT_LAYOUT);
    };

    if (layout.value.length === 0 && !hydrated) loadLayout();

    return { layout, loadLayout, isProductPinned, toggleProductPin, addWidget, removeWidget, resetLayout };
}

/** Cache locally, then debounce-save to the user's profile. */
function persist() {
    const { profile } = useProfile();
    try {
        localStorage.setItem(LOCAL_KEY, JSON.stringify(layout.value));
    } catch { /* quota */ }
    if (!profile.value) return;
    if (saveTimer) clearTimeout(saveTimer);
    const userId = profile.value.id;
    const snapshot = clone(layout.value);
    saveTimer = setTimeout(async () => {
        const { error } = await supabase.from('user_profiles').update({ dashboard_layout: snapshot }).eq('id', userId);
        if (error) console.error('Dashboard-Layout konnte nicht gespeichert werden', error);
        else if (profile.value) profile.value.dashboard_layout = snapshot;
    }, 800);
}

// Registered once at module scope (calling useDashboard() repeatedly used to
// stack up a new watcher each time).
watch(layout, () => {
    if (hydrated) persist();
}, { deep: true });
