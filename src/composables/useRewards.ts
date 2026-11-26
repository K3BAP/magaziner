import { ref, computed } from 'vue';
import { supabase } from '../supabase';
import { useActiveHousehold, householdSnapshot } from './useActiveHousehold';
import { useAuth } from './useAuth';
import { useGame } from './useGame';
import { toast } from './useToast';

/**
 * Belohnungs-Shop: rewards anyone in the household can define, and the
 * vouchers (`reward_redemptions`) created by redeeming them. Rewards are plain
 * RLS rows; redeeming, fulfilling and cancelling go through RPCs because they
 * move coins in the ledger.
 */

export interface Reward {
  id: string;
  household_id: string;
  emoji: string;
  title: string;
  cost: number;
  created_by: string | null;
  created_at: string;
  archived_at: string | null;
}

export interface Redemption {
  id: string;
  household_id: string;
  reward_id: string | null;
  title: string;
  emoji: string;
  cost: number;
  redeemed_by: string | null;
  redeemed_at: string;
  fulfilled_by: string | null;
  fulfilled_at: string | null;
  cancelled_at: string | null;
}

export type RewardInput = Pick<Reward, 'emoji' | 'title' | 'cost'>;

const rewards = ref<Reward[]>([]);
const redemptions = ref<Redemption[]>([]);
const loaded = ref(false);
const loading = ref(false);
const busy = ref<Set<string>>(new Set());

const CANCEL_WINDOW_MS = 24 * 3600_000;

const sortRewards = () => rewards.value.sort((a, b) => a.cost - b.cost || a.title.localeCompare(b.title, 'de'));
const sortRedemptions = () => redemptions.value.sort((a, b) => b.redeemed_at.localeCompare(a.redeemed_at));

export function useRewards() {
  const { activeHouseholdId } = useActiveHousehold();
  const { user } = useAuth();
  const game = useGame();

  const fetchRewards = async () => {
    const isCurrent = householdSnapshot();
    loading.value = true;
    try {
      const [r, v] = await Promise.all([
        supabase.from('rewards').select('*').is('archived_at', null),
        supabase.from('reward_redemptions').select('*').order('redeemed_at', { ascending: false }).limit(80),
      ]);
      if (!isCurrent()) return;
      if (r.error) throw r.error;
      if (v.error) throw v.error;
      rewards.value = (r.data ?? []) as Reward[];
      redemptions.value = (v.data ?? []) as Redemption[];
      sortRewards();
      loaded.value = true;
    } catch (e) {
      console.error('Shop konnte nicht geladen werden', e);
    } finally {
      loading.value = false;
    }
  };

  const upsertReward = (row: Reward) => {
    const i = rewards.value.findIndex((r) => r.id === row.id);
    if (row.archived_at) {
      if (i !== -1) rewards.value.splice(i, 1);
      return;
    }
    if (i === -1) rewards.value.push(row);
    else rewards.value[i] = row;
    sortRewards();
  };

  const upsertRedemption = (row: Redemption) => {
    const i = redemptions.value.findIndex((r) => r.id === row.id);
    if (i === -1) redemptions.value.push(row);
    else redemptions.value[i] = row;
    sortRedemptions();
  };

  const addReward = async (input: RewardInput) => {
    if (!activeHouseholdId.value) return null;
    const { data, error } = await supabase
      .from('rewards')
      .insert({ ...input, title: input.title.trim(), household_id: activeHouseholdId.value })
      .select()
      .single();
    if (error || !data) {
      toast.error('Belohnung konnte nicht gespeichert werden.', error);
      return null;
    }
    upsertReward(data as Reward);
    return data as Reward;
  };

  const updateReward = async (id: string, patch: Partial<RewardInput>) => {
    const { data, error } = await supabase.from('rewards').update(patch).eq('id', id).select().single();
    if (error || !data) {
      toast.error('Belohnung konnte nicht gespeichert werden.', error);
      return false;
    }
    upsertReward(data as Reward);
    return true;
  };

  const setArchived = async (id: string, archived: boolean) => {
    const { data, error } = await supabase
      .from('rewards')
      .update({ archived_at: archived ? new Date().toISOString() : null })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    upsertReward(data as Reward);
  };

  /** Archives, so vouchers keep their link; undo brings it back. */
  const archiveReward = async (reward: Reward) => {
    try {
      await setArchived(reward.id, true);
    } catch (e) {
      return toast.error('Belohnung konnte nicht gelöscht werden.', e);
    }
    toast.undo(`„${reward.title}“ gelöscht`, () =>
      setArchived(reward.id, false).catch((e) => toast.error('Wiederherstellen fehlgeschlagen.', e)),
    );
  };

  const withBusy = async <T>(id: string, fn: () => Promise<T>): Promise<T | null> => {
    if (busy.value.has(id)) return null;
    busy.value = new Set(busy.value).add(id);
    try {
      return await fn();
    } finally {
      const next = new Set(busy.value);
      next.delete(id);
      busy.value = next;
    }
  };

  const refetchRedemption = async (id: string) => {
    const { data } = await supabase.from('reward_redemptions').select('*').eq('id', id).maybeSingle();
    if (data) upsertRedemption(data as Redemption);
  };

  const redeem = (reward: Reward) =>
    withBusy(reward.id, async () => {
      const { data, error } = await supabase.rpc('redeem_reward', { p_reward_id: reward.id });
      if (error) {
        toast.error('Einlösen hat nicht geklappt.', error);
        return false;
      }
      const res = data as { status: 'ok' | 'insufficient'; id?: string; missing?: number };
      if (res.status === 'insufficient') {
        toast.info(`Dir fehlen noch ${res.missing} 🪙.`);
        game.refresh();
        return false;
      }
      await refetchRedemption(res.id!);
      game.refresh();
      toast.undo(`${reward.emoji} „${reward.title}“ eingelöst · −${reward.cost} 🪙`, () => cancelById(res.id!));
      return true;
    });

  const cancelById = async (id: string) => {
    const { data, error } = await supabase.rpc('cancel_redemption', { p_redemption_id: id });
    if (error) {
      const msg = error.message?.includes('too old') ? 'Stornieren geht nur innerhalb von 24 Stunden.' : 'Stornieren hat nicht geklappt.';
      toast.error(msg, error);
      return false;
    }
    await refetchRedemption(id);
    game.refresh();
    if ((data as { status: string }).status === 'closed') {
      toast.info('Der Gutschein ist schon erledigt.');
      return false;
    }
    return true;
  };

  const cancel = (r: Redemption) =>
    withBusy(r.id, async () => {
      if (await cancelById(r.id)) toast.success(`Storniert – ${r.cost} 🪙 sind zurück.`);
    });

  const fulfill = (r: Redemption) =>
    withBusy(r.id, async () => {
      const { error } = await supabase.rpc('fulfill_redemption', { p_redemption_id: r.id });
      if (error) return toast.error('Abhaken hat nicht geklappt.', error);
      await refetchRedemption(r.id);
      toast.success(`${r.emoji} „${r.title}“ erfüllt`);
    });

  // --- Realtime ------------------------------------------------------------

  const applyRemoteReward = (event: 'INSERT' | 'UPDATE' | 'DELETE', row: any, old: any) => {
    if (event === 'DELETE') {
      rewards.value = rewards.value.filter((r) => r.id !== old?.id);
      return;
    }
    upsertReward(row as Reward);
  };

  const applyRemoteRedemption = (event: 'INSERT' | 'UPDATE' | 'DELETE', row: any, old: any) => {
    if (event === 'DELETE') {
      redemptions.value = redemptions.value.filter((r) => r.id !== old?.id);
      return;
    }
    upsertRedemption(row as Redemption);
    game.refreshSoon();
  };

  const clearRewards = () => {
    rewards.value = [];
    redemptions.value = [];
    loaded.value = false;
  };

  // --- Derived -------------------------------------------------------------

  const isOpen = (r: Redemption) => !r.fulfilled_at && !r.cancelled_at;
  const openVouchers = computed(() => redemptions.value.filter(isOpen));
  /** Vouchers someone else redeemed — mine to fulfil. */
  const toFulfil = computed(() => openVouchers.value.filter((r) => r.redeemed_by !== user.value?.id));
  const myOpen = computed(() => openVouchers.value.filter((r) => r.redeemed_by === user.value?.id));
  const closed = computed(() => redemptions.value.filter((r) => !isOpen(r)).slice(0, 20));
  const canCancel = (r: Redemption) =>
    isOpen(r) && r.redeemed_by === user.value?.id && Date.now() - new Date(r.redeemed_at).getTime() < CANCEL_WINDOW_MS;

  return {
    rewards,
    redemptions,
    loaded,
    loading,
    busy,
    openVouchers,
    toFulfil,
    myOpen,
    closed,
    canCancel,
    fetchRewards,
    addReward,
    updateReward,
    archiveReward,
    redeem,
    cancel,
    fulfill,
    applyRemoteReward,
    applyRemoteRedemption,
    clearRewards,
  };
}
