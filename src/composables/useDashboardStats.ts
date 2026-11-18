import { computed } from 'vue';
import { useInventory, itemExpiryStatus, isBelowMinimum } from './useInventory';
import { expiryStatus } from '../utils/date';

/**
 * Inventory counters for the dashboard. Counted per *product* (not per
 * package) so the numbers match the filters on the „Alle Vorräte“ page.
 */
export function useDashboardStats() {
  const { items } = useInventory();

  const stats = computed(() => {
    let expired = 0;
    let soon = 0;
    let ok = 0;
    let opened = 0;
    let low = 0;
    for (const item of items.value) {
      const s = itemExpiryStatus(item);
      if (s === 'expired') expired++;
      else if (s === 'soon') soon++;
      else ok++;
      if (item.instances.some((i) => i.opened_at)) opened++;
      if (isBelowMinimum(item)) low++;
    }
    return { expired, soon, ok, opened, low };
  });

  /** @deprecated use expiryStatus from utils/date */
  const getExpiryStatus = (dateStr: string | null) => {
    const s = expiryStatus(dateStr);
    return s === 'none' ? 'ok' : s;
  };

  return { stats, getExpiryStatus };
}
