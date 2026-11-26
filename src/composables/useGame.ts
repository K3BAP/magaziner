import { ref, computed } from 'vue';
import { supabase } from '../supabase';
import { householdSnapshot } from './useActiveHousehold';
import { toast } from './useToast';
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
  joker_used: boolean;
  away_until: string | null;
  badges: { key: string; at: string }[];
}

export interface Quest {
  id: string;
  key: string;
  params: { area_id?: string };
  target: number;
  progress: number;
  reward: number;
  completed_at: string | null;
}

export interface WeekRecap {
  week_start: string;
  goal_xp: number | null;
  team_xp: number;
  goal_reached: boolean;
  rated: boolean;
  members: { user_id: string; xp: number; count: number }[];
  quests: { key: string; params: { area_id?: string }; target: number; reward: number; done: boolean }[];
  highlights: { top?: { title: string; xp: number; user_id: string } | null; rescues?: number; count?: number; energy?: number };
}

export interface GameStatus {
  household_id: string;
  today: string;
  week_start: string;
  energy: number;
  goal_xp: number;
  goal_failed: boolean;
  goal_streak: number;
  paused_until: string | null;
  members: MemberGame[];
  quests: Quest[];
  recap: WeekRecap | null;
}

export interface MemberStats {
  weeks: { week_start: string; count: number; xp: number }[];
  total: number;
  rescues: number;
  fav_area: { area_id: string; count: number } | null;
  kudos_received: number;
  kudos_given: number;
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
  energy?: number;
  coin_factor?: number;
  new_badges?: string[];
  quests_done?: { key: string; params: { area_id?: string }; reward: number }[];
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
    // Let the "+XP" burst play first; the sheet's backdrop would cover it.
    if (res.level_after > res.level_before) setTimeout(() => (levelUp.value = ev), 1300);
  };

  const rpc = async (fn: string, args: Record<string, unknown>, failMsg: string) => {
    const { error } = await supabase.rpc(fn, args);
    if (error) {
      toast.error(failMsg, error);
      return false;
    }
    await fetchStatus();
    return true;
  };

  /** "Ich bin weg bis …" — null ends it. */
  const setAway = (until: string | null) => rpc('set_away', { p_until: until }, 'Urlaub konnte nicht gespeichert werden.');
  /** Pause for the whole household — null ends it (and shifts the freshness bars). */
  const setHouseholdPause = (until: string | null) =>
    rpc('set_household_pause', { p_until: until }, 'Pause konnte nicht gespeichert werden.');

  /** Profile statistics (last 8 weeks, favourite room, kudos). */
  const fetchMemberStats = async (userId: string): Promise<MemberStats | null> => {
    const { data, error } = await supabase.rpc('member_stats', { p_user_id: userId });
    if (error) {
      console.error('Statistik konnte nicht geladen werden', error);
      return null;
    }
    return data as MemberStats;
  };

  const markRecapSeen = async (week: string) => {
    if (status.value?.recap?.week_start === week) status.value = { ...status.value, recap: null };
    const { error } = await supabase.rpc('mark_recap_seen', { p_week: week });
    if (error) console.error('Rückblick konnte nicht markiert werden', error);
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
  const goalProgress = computed(() => {
    const goal = status.value?.goal_xp ?? 0;
    return goal ? Math.min(1, teamWeekXp.value / goal) : 0;
  });
  /** Days left in the current week, today included (Mon = 7 … Sun = 1). */
  const daysLeftInWeek = computed(() => {
    const ws = status.value?.week_start;
    const today = status.value?.today;
    if (!ws || !today) return 0;
    const diff = Math.round((Date.parse(today) - Date.parse(ws)) / 86_400_000);
    return Math.max(1, 7 - diff);
  });

  return {
    status,
    loading,
    lastReward,
    levelUp,
    me,
    myProgress,
    weekShares,
    teamWeekXp,
    goalProgress,
    daysLeftInWeek,
    setAway,
    setHouseholdPause,
    markRecapSeen,
    fetchMemberStats,
    fetchStatus,
    refresh,
    refreshSoon,
    announce,
    clearGame,
    statsOf,
    displayName,
  };
}
