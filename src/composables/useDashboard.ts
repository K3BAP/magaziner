import { ref, watch, onMounted } from 'vue';

export type WidgetType = 'expired' | 'soon' | 'opened' | 'inventory-chart' | 'location-chart' | 'todos' | 'product' | 'shortcut' | 'shopping-list';

export interface DashboardWidget {
    id: string;
    type: WidgetType;
    props?: any;
    colSpan?: 1 | 2; // 1 = half width, 2 = full width
}

const DEFAULT_LAYOUT: DashboardWidget[] = [
    { id: 'w1', type: 'expired', colSpan: 1 },
    { id: 'w2', type: 'soon', colSpan: 1 },
    { id: 'w3', type: 'opened', colSpan: 2 },
    { id: 'w4', type: 'inventory-chart', colSpan: 1 },
    { id: 'w5', type: 'todos', colSpan: 1 },
    { id: 'w6', type: 'location-chart', colSpan: 2 },
];

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

    // Watch for changes and save (if layout is already initialized)
    watch(layout, () => {
        saveLayout();
    }, { deep: true });

    const isProductPinned = (productId: string) => {
        return layout.value.some(w => w.type === 'product' && w.props?.productId === productId);
    };

    const toggleProductPin = (productId: string) => {
        console.log('Toggling pin for:', productId); // Debug
        if (isProductPinned(productId)) {
            console.log('Removing pin');
            layout.value = layout.value.filter(w => !(w.type === 'product' && w.props?.productId === productId));
        } else {
            console.log('Adding pin');
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
            colSpan: (type === 'opened' || type === 'location-chart') ? 2 : 1
        });
    };

    const removeWidget = (id: string) => {
        layout.value = layout.value.filter(w => w.id !== id);
    };

    const moveWidget = (index: number, direction: -1 | 1) => {
        const newIndex = index + direction;
        if (newIndex < 0 || newIndex >= layout.value.length) return;
        const temp = layout.value[index];
        layout.value[index] = layout.value[newIndex];
        layout.value[newIndex] = temp;
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
        moveWidget
    };
}
