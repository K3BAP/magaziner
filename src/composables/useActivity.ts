import { ref } from 'vue';
import { supabase } from '../supabase';
import { householdSnapshot } from './useActiveHousehold';

/**
 * Household-wide activity feed. Rows are written by DB triggers on
 * item_instances / todos / shopping_list (see migration v2_activity_log), so
 * every member sees who did what, on every device.
 */

export type ActivityKind = 'added' | 'opened' | 'consumed' | 'removed' | 'bought' | 'todo_done';

export interface ActivityEntry {
  id: string;
  kind: ActivityKind;
  subject: string;
  actor_id: string | null;
  created_at: string;
}

const entries = ref<ActivityEntry[]>([]);
const loading = ref(false);
const LIMIT = 30;

export function useActivity() {
  const fetchActivity = async () => {
    const isCurrent = householdSnapshot();
    loading.value = true;
    try {
      const { data, error } = await supabase
        .from('activity_log')
        .select('id, kind, subject, actor_id, created_at')
        .order('created_at', { ascending: false })
        .limit(LIMIT);
      if (!isCurrent()) return;
      if (error) throw error;
      entries.value = (data ?? []) as ActivityEntry[];
    } catch (e) {
      // The feed is decorative; don't toast for it.
      console.error('Aktivität konnte nicht geladen werden', e);
    } finally {
      loading.value = false;
    }
  };

  /** Called by the realtime layer for new rows. */
  const pushEntry = (row: ActivityEntry) => {
    if (entries.value.some((e) => e.id === row.id)) return;
    entries.value = [row, ...entries.value].slice(0, LIMIT);
  };

  const clearActivity = () => {
    entries.value = [];
  };

  return { entries, loading, fetchActivity, pushEntry, clearActivity };
}

export const ACTIVITY_VERB: Record<ActivityKind, string> = {
  added: 'hinzugefügt',
  opened: 'geöffnet',
  consumed: 'verbraucht',
  removed: 'aufgebraucht',
  bought: 'eingekauft',
  todo_done: 'erledigt',
};
