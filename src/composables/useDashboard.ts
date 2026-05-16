import { ref, watch } from 'vue';

export type WidgetType =
    | 'expired'
    | 'soon'
    | 'opened'
    | 'inventory-chart'
    | 'location-chart'
    | 'todos'
    | 'product'
    | 'shortcut'
    | 'shopping-list'
    | 'recent-activity'
    | 'finance-snapshot'
    | 'quick-add';

export interface DashboardWidget {
    id: string;
    type: WidgetType;
    props?: any;
    colSpan?: 1 | 2; // 1 = half width, 2 = full width
}

const DEFAULT_LAYOUT: DashboardWidget[] = [
    { id: 'w-quickadd', type: 'quick-add', colSpan: 2 },
    { id: 'w1', type: 'expired', colSpan: 1 },
    { id: 'w2', type: 'soon', colSpan: 1 },
    { id: 'w3', type: 'opened', colSpan: 2 },
    { id: 'w-activity', type: 'recent-activity', colSpan: 2 },
    { id: 'w4', type: 'inventory-chart', colSpan: 1 },
    { id: 'w5', type: 'todos', colSpan: 1 },
    { id: 'w6', type: 'location-chart', colSpan: 2 },
];

// Widgets that must always take the full row.
const FULL_WIDTH_TYPES = new Set<WidgetType>(['quick-add', 'recent-activity']);

const defaultColSpan = (type: WidgetType): 1 | 2 => {
    if (FULL_WIDTH_TYPES.has(type)) return 2;
    if (type === 'opened' || type === 'location-chart') return 2;
    return 1;
};

export const isWidthLocked = (type: WidgetType) => FULL_WIDTH_TYPES.has(type);

const layout = ref<DashboardWidget[]>([]);

export function useDashboard() {

    const loadLayout = () => {
        const saved = localStorage.getItem('dashboard_layout_v1');
        if (saved) {
            try {
                layout.value = JSON.parse(saved);
            } catch (e) {
                console.error('Layout parse error', e);
                layout.value = [...DEFAULT_LAYOUT];
            }
        } else {
            layout.value = [...DEFAULT_LAYOUT];
        }
    };

    const saveLayout = () => {
        localStorage.setItem('dashboard_layout_v1', JSON.stringify(layout.value));
    };

    watch(layout, () => {
        saveLayout();
    }, { deep: true });

    const isProductPinned = (productId: string) => {
        return layout.value.some(w => w.type === 'product' && w.props?.productId === productId);
    };

    const toggleProductPin = (productId: string) => {
        if (isProductPinned(productId)) {
            layout.value = layout.value.filter(w => !(w.type === 'product' && w.props?.productId === productId));
        } else {
            layout.value.push({
                id: 'w-item-' + Date.now(),
                type: 'product',
                props: { productId },
                colSpan: 1
            });
        }
    };

    const addWidget = (type: WidgetType, props?: any) => {
        layout.value.push({
            id: 'w-' + Date.now(),
            type,
            props,
            colSpan: defaultColSpan(type),
        });
    };

    const removeWidget = (id: string) => {
        layout.value = layout.value.filter(w => w.id !== id);
    };

    const resetLayout = () => {
        layout.value = [...DEFAULT_LAYOUT];
    };

    // Initialize once if empty
    if (layout.value.length === 0) {
        loadLayout();
    }

    return {
        layout,
        isProductPinned,
        toggleProductPin,
        addWidget,
        removeWidget,
        resetLayout,
    };
}
