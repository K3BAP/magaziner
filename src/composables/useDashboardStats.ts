import { computed } from 'vue';
import { useInventory } from './useInventory';

export function useDashboardStats() {
    const { items } = useInventory();

    const getExpiryStatus = (dateStr: string | null) => {
        if (!dateStr) return 'ok';
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const expiry = new Date(dateStr);
        const diffTime = expiry.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (86400000));

        if (diffDays < 0) return 'expired';
        if (diffDays <= 14) return 'soon';
        return 'ok';
    };

    const stats = computed(() => {
        let expired = 0;
        let soon = 0;
        let ok = 0;
        let opened = 0;

        items.value.forEach(item => {
            if (item.instances && item.instances.length > 0) {
                item.instances.forEach(inst => {
                    // Status prüfen (MHD)
                    const status = getExpiryStatus(inst.expiry_date);
                    if (status === 'expired') expired++;
                    else if (status === 'soon') soon++;
                    else ok++;

                    // Status prüfen (Geöffnet)
                    if (inst.opened_at) opened++;
                });
            } else {
                ok++;
            }
        });
        return { expired, soon, ok, opened };
    });

    return {
        stats,
        getExpiryStatus
    };
}
