import { ref } from 'vue';
import { supabase } from '../supabase';
import { householdSnapshot } from './useActiveHousehold';

/**
 * Household-wide activity feed. Rows are written by DB triggers on
 * item_instances / shopping_list (v2_activity_log) and by `complete_chore`, so
 * every member sees who did what, on every device.
 */

export type ActivityKind =
  | 'added'
  | 'opened'
  | 'consumed'
  | 'removed'
  | 'bought'
  | 'todo_done'
  | 'kudos'
  | 'reward_redeemed'
  | 'reward_fulfilled';

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

  const dropEntry = (id: string | undefined) => {
    if (id) entries.value = entries.value.filter((e) => e.id !== id);
  };

  const clearActivity = () => {
    entries.value = [];
  };

  return { entries, loading, fetchActivity, pushEntry, dropEntry, clearActivity };
}

export const ACTIVITY_VERB: Record<ActivityKind, string> = {
  added: 'hinzugefügt',
  opened: 'geöffnet',
  consumed: 'verbraucht',
  removed: 'aufgebraucht',
  bought: 'eingekauft',
  todo_done: 'erledigt',
  kudos: 'Kudos gegeben',
  reward_redeemed: 'eingelöst',
  reward_fulfilled: 'erfüllt',
};

/** Word before the subject („Anna hat <für> Bad putzen Kudos gegeben“). */
export const ACTIVITY_PREFIX: Partial<Record<ActivityKind, string>> = {
  kudos: 'für',
};
