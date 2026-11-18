import { ref } from 'vue';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from '../supabase';
import { useShoppingList } from './useShoppingList';
import { useShoppingLists } from './useShoppingLists';
import { useTodos } from './useTodos';
import { useInventory } from './useInventory';
import { useActivity, type ActivityEntry } from './useActivity';

/**
 * Live sync for the active household. One channel, subscribed to the tables in
 * the `supabase_realtime` publication (migration v2_realtime_and_recipe_images).
 * Realtime applies each subscriber's RLS, so only rows of the caller's active
 * household arrive. DELETE payloads can't be filtered server-side and only
 * carry the primary key — the handlers ignore ids they don't know.
 *
 * Our own writes echo back too; every handler is idempotent.
 */

let channel: RealtimeChannel | null = null;
let channelHid: string | null = null;
export const realtimeStatus = ref<'off' | 'connecting' | 'live' | 'error'>('off');

function debounce<T extends (...args: any[]) => void>(fn: T, ms: number) {
  let t: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

type Payload = RealtimePostgresChangesPayload<Record<string, any>>;

export function useRealtime() {
  const shopping = useShoppingList();
  const lists = useShoppingLists();
  const todos = useTodos();
  const inventory = useInventory();
  const activity = useActivity();

  const refetchInventory = debounce(() => inventory.fetchInventory({ silent: true }), 400);
  const refetchLists = debounce(() => lists.fetchLists({ silent: true }), 400);

  const stop = async () => {
    if (channel) {
      const c = channel;
      channel = null;
      channelHid = null;
      await supabase.removeChannel(c);
    }
    realtimeStatus.value = 'off';
  };

  const start = async (hid: string | null) => {
    if (!hid) return stop();
    if (channel && channelHid === hid) return;
    await stop();

    const filter = `household_id=eq.${hid}`;
    realtimeStatus.value = 'connecting';
    channelHid = hid;

    const on = (table: string, handler: (p: Payload) => void, withDelete = true) => {
      channel!
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table, filter }, handler)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table, filter }, handler);
      if (withDelete) channel!.on('postgres_changes', { event: 'DELETE', schema: 'public', table }, handler);
    };

    channel = supabase.channel(`household:${hid}`);

    on('shopping_list', (p) => shopping.applyRemote(p.eventType, p.new as any, p.old as any));
    on('shopping_lists', () => refetchLists());
    on('todos', (p) => todos.applyRemote(p.eventType, p.new as any, p.old as any));
    on('items', (p) => {
      // Deletes of unknown rows (other households) are ignored.
      if (p.eventType === 'DELETE' && !inventory.items.value.some((i) => i.id === (p.old as any)?.id)) return;
      refetchInventory();
    });
    on('item_instances', (p) => {
      if (
        p.eventType === 'DELETE' &&
        !inventory.items.value.some((i) => i.instances.some((x) => x.id === (p.old as any)?.id))
      )
        return;
      refetchInventory();
    });
    on('activity_log', (p) => {
      if (p.eventType === 'INSERT') activity.pushEntry(p.new as ActivityEntry);
    }, false);

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') realtimeStatus.value = 'live';
      else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') realtimeStatus.value = 'error';
      else if (status === 'CLOSED') realtimeStatus.value = 'off';
    });
  };

  return { start, stop, realtimeStatus };
}
