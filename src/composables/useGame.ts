import { ref, computed } from 'vue';
import { supabase } from '../supabase';
import { householdSnapshot } from './useActiveHousehold';
import { useActiveMembers } from './useHouseholdMembers';
import { useAuth } from './useAuth';
import { levelProgress, type RewardFlag } from '../utils/game';

/**
 * Game state of the active household (XP, level, coins, streaks per member),
 * loaded in one go via the `game_status` RPC and refreshed after completions.
 * Also the event bus for reward animations: `announce` is called after a
 * successful `complete_chore`.
 */

export interface MemberGame {
  user_id: string;
  xp_total: number;
  xp_week: number;
  done_week: number;
  coins: number;
  level: number;
  streak_current: number;
  streak_best: number;
  streak_last_day: string | null;
}

export interface GameStatus {
  household_id: string;
  today: string;
  week_start: string;
  members: MemberGame[];
}

export interface RewardResult {
  status: 'ok' | 'already_done';
  completion_id?: string;
  xp: number;
  coins: number;
  flags: RewardFlag[];
  level_before: number;
  level_after: number;
  level_coins: number;
  xp_total: number;
  streak: number;
  next_due: string | null;
  next_assignee: string | null;
  by?: string | null;
  at?: string | null;
}

export interface RewardEvent extends RewardResult {
  id: number;
  title: string;
}

const status = ref<GameStatus | null>(null);
const loading = ref(false);
/** Latest reward, consumed by the floating "+XP" burst. */
const lastReward = ref<RewardEvent | null>(null);
/** Set when a completion crossed a level boundary; drives the celebration sheet. */
const levelUp = ref<RewardEvent | null>(null);
let eventId = 0;
let refreshTimer: ReturnType<typeof setTimeout> | null = null;

export function useGame() {
  const { user } = useAuth();
  const { memberById } = useActiveMembers();

  const fetchStatus = async () => {
    const isCurrent = householdSnapshot();
    loading.value = true;
    try {
      const { data, error } = await supabase.rpc('game_status');
      if (!isCurrent()) return;
      if (error) throw error;
      status.value = (data as GameStatus | null) ?? null;
    } catch (e) {
      // Decorative; the list still works without it.
      console.error('Spielstand konnte nicht geladen werden', e);
    } finally {
      loading.value = false;
    }
  };

  const refresh = () => fetchStatus();
  /** Debounced refresh for realtime bursts. */
  const refreshSoon = () => {
    if (refreshTimer) clearTimeout(refreshTimer);
    refreshTimer = setTimeout(fetchStatus, 500);
  };

  const announce = (res: RewardResult, title: string) => {
    const ev = { ...res, title, id: ++eventId };
    lastReward.value = ev;
    if (res.level_after > res.level_before) levelUp.value = ev;
  };

  const clearGame = () => {
    status.value = null;
    lastReward.value = null;
    levelUp.value = null;
  };

  const statsOf = (userId: string | null | undefined) =>
    status.value?.members.find((m) => m.user_id === userId) ?? null;

  const me = computed(() => statsOf(user.value?.id));
  const myProgress = computed(() => levelProgress(me.value?.xp_total ?? 0));

  const displayName = (id: string | null | undefined) => {
    if (!id) return 'Jemand';
    if (id === user.value?.id) return 'Du';
    return memberById(id)?.display_name ?? 'Jemand';
  };

  /** Week XP shares for the fairness bar. */
  const weekShares = computed(() => {
    const ms = status.value?.members ?? [];
    const total = ms.reduce((s, m) => s + m.xp_week, 0);
    return ms.map((m) => ({ ...m, share: total ? m.xp_week / total : 0 }));
  });
  const teamWeekXp = computed(() => (status.value?.members ?? []).reduce((s, m) => s + m.xp_week, 0));

  return {
    status,
    loading,
    lastReward,
    levelUp,
    me,
    myProgress,
    weekShares,
    teamWeekXp,
    fetchStatus,
    refresh,
    refreshSoon,
    announce,
    clearGame,
    statsOf,
    displayName,
  };
}
