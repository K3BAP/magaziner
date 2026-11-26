import { ref, computed } from 'vue';
import { supabase } from '../supabase';
import { useActiveHousehold, householdSnapshot } from './useActiveHousehold';
import { useAuth } from './useAuth';
import { toast } from './useToast';
import { useGame, type RewardResult } from './useGame';
import type { KudosEmoji } from '../data/gameCatalog';
import { addDaysISO, todayLocalISO } from '../utils/date';
import { freshness, type AssignMode, type ChoreKind, type Effort, type RewardFlag } from '../utils/game';

/**
 * Household chores (Aufgaben 3.0). Recurring chores carry a freshness interval,
 * one-off chores an optional due date. Completing goes through the
 * `complete_chore` RPC, which books XP/coins and rotates the assignee.
 */

export interface Chore {
  id: string;
  household_id: string;
  title: string;
  notes: string | null;
  area_id: string | null;
  kind: ChoreKind;
  interval_days: number | null;
  due_date: string | null;
  next_due: string | null;
  effort: Effort;
  unpopular: boolean;
  assign_mode: AssignMode;
  rotation: string[];
  current_assignee: string | null;
  last_done_at: string | null;
  last_done_by: string | null;
  completed_at: string | null;
  created_by: string | null;
  created_at: string;
  archived_at: string | null;
}

export interface ChoreArea {
  id: string;
  household_id: string;
  name: string;
  emoji: string;
  sort: number;
}

export interface ChoreCompletion {
  id: string;
  chore_id: string | null;
  chore_title: string;
  area_id: string | null;
  user_id: string | null;
  done_at: string;
  xp: number;
  coins: number;
  flags: RewardFlag[];
  /** Kudos other members gave this completion. */
  kudos: { user_id: string; emoji: string }[];
}

export type ChoreInput = Pick<
  Chore,
  'title' | 'notes' | 'area_id' | 'kind' | 'interval_days' | 'due_date' | 'next_due' | 'effort' | 'unpopular' | 'assign_mode' | 'rotation' | 'current_assignee'
>;

const chores = ref<Chore[]>([]);
const areas = ref<ChoreArea[]>([]);
const recent = ref<ChoreCompletion[]>([]);
const loading = ref(false);
const loaded = ref(false);
/** Chores whose completion RPC is in flight (drives the row animation). */
const completing = ref<Set<string>>(new Set());

const RECENT_DAYS = 14;

const normalize = (row: any): Chore => ({ ...row, rotation: row.rotation ?? [], unpopular: !!row.unpopular });
const normalizeCompletion = ({ chore_kudos, ...row }: any): ChoreCompletion => ({
  ...row,
  flags: row.flags ?? [],
  kudos: (chore_kudos ?? row.kudos ?? []) as ChoreCompletion['kudos'],
});

export function useChores() {
  const { activeHouseholdId } = useActiveHousehold();
  const { user } = useAuth();
  const game = useGame();

  const fetchChores = async () => {
    const isCurrent = householdSnapshot();
    loading.value = true;
    try {
      const since = new Date(Date.now() - RECENT_DAYS * 86_400_000).toISOString();
      const [c, a, r] = await Promise.all([
        supabase.from('chores').select('*').is('archived_at', null),
        supabase.from('chore_areas').select('*').order('sort').order('created_at'),
        supabase
          .from('chore_completions')
          .select('id, chore_id, chore_title, area_id, user_id, done_at, xp, coins, flags, chore_kudos(user_id, emoji)')
          .gte('done_at', since)
          .order('done_at', { ascending: false })
          .limit(60),
      ]);
      if (!isCurrent()) return;
      if (c.error) throw c.error;
      if (a.error) throw a.error;
      if (r.error) throw r.error;
      chores.value = (c.data ?? []).map(normalize);
      areas.value = (a.data ?? []) as ChoreArea[];
      recent.value = (r.data ?? []).map(normalizeCompletion);
      loaded.value = true;
    } catch (e) {
      toast.error('Aufgaben konnten nicht geladen werden.', e);
    } finally {
      loading.value = false;
    }
  };

  const fetchAreas = async () => {
    const isCurrent = householdSnapshot();
    const { data, error } = await supabase.from('chore_areas').select('*').order('sort').order('created_at');
    if (!isCurrent() || error) return;
    areas.value = (data ?? []) as ChoreArea[];
  };

  const upsertLocal = (row: Chore) => {
    const idx = chores.value.findIndex((c) => c.id === row.id);
    if (row.archived_at) {
      if (idx !== -1) chores.value.splice(idx, 1);
      return;
    }
    if (idx === -1) chores.value.push(row);
    else chores.value[idx] = { ...chores.value[idx], ...row };
  };

  const addChore = async (input: ChoreInput) => {
    if (!activeHouseholdId.value) {
      toast.error('Kein aktiver Haushalt.');
      return null;
    }
    const { data, error } = await supabase
      .from('chores')
      .insert({ ...input, title: input.title.trim(), household_id: activeHouseholdId.value })
      .select()
      .single();
    if (error || !data) {
      toast.error('Aufgabe konnte nicht gespeichert werden.', error);
      return null;
    }
    upsertLocal(normalize(data));
    return normalize(data);
  };

  /** Bulk insert (onboarding templates). */
  const addChores = async (inputs: ChoreInput[]) => {
    if (!activeHouseholdId.value || inputs.length === 0) return false;
    const hid = activeHouseholdId.value;
    const { data, error } = await supabase
      .from('chores')
      .insert(inputs.map((i) => ({ ...i, household_id: hid })))
      .select();
    if (error) {
      toast.error('Aufgaben konnten nicht angelegt werden.', error);
      return false;
    }
    for (const row of data ?? []) upsertLocal(normalize(row));
    return true;
  };

  const updateChore = async (id: string, patch: Partial<ChoreInput>) => {
    const chore = chores.value.find((c) => c.id === id);
    if (!chore) return false;
    const prev = { ...chore };
    Object.assign(chore, patch);
    const { error } = await supabase.from('chores').update(patch).eq('id', id);
    if (error) {
      Object.assign(chore, prev);
      toast.error('Aufgabe konnte nicht gespeichert werden.', error);
      return false;
    }
    return true;
  };

  const setArchived = async (ids: string[], archived: boolean) => {
    const stamp = archived ? new Date().toISOString() : null;
    const { data, error } = await supabase.from('chores').update({ archived_at: stamp }).in('id', ids).select();
    if (error) throw error;
    for (const row of data ?? []) upsertLocal(normalize(row));
  };

  /** "Löschen" archives, so the history of completions stays linked. */
  const archiveChore = async (id: string) => {
    const doomed = chores.value.find((c) => c.id === id);
    if (!doomed) return;
    chores.value = chores.value.filter((c) => c.id !== id);
    try {
      await setArchived([id], true);
    } catch (e) {
      chores.value.push(doomed);
      return toast.error('Aufgabe konnte nicht gelöscht werden.', e);
    }
    toast.undo(`„${doomed.title}“ gelöscht`, () =>
      setArchived([id], false).catch((e) => toast.error('Wiederherstellen fehlgeschlagen.', e)),
    );
  };

  const archiveCompletedOnce = async () => {
    const doomed = chores.value.filter((c) => c.kind === 'once' && c.completed_at);
    if (doomed.length === 0) return;
    const ids = doomed.map((c) => c.id);
    chores.value = chores.value.filter((c) => !ids.includes(c.id));
    try {
      await setArchived(ids, true);
    } catch (e) {
      chores.value.push(...doomed);
      return toast.error('Erledigte konnten nicht gelöscht werden.', e);
    }
    toast.undo(
      doomed.length === 1 ? 'Eine erledigte Aufgabe gelöscht' : `${doomed.length} erledigte Aufgaben gelöscht`,
      () => setArchived(ids, false).catch((e) => toast.error('Wiederherstellen fehlgeschlagen.', e)),
    );
  };

  const complete = async (chore: Chore): Promise<RewardResult | null> => {
    if (completing.value.has(chore.id)) return null;
    completing.value = new Set(completing.value).add(chore.id);
    try {
      const { data, error } = await supabase.rpc('complete_chore', { p_chore_id: chore.id });
      if (error) throw error;
      const res = data as RewardResult;
      if (res.status === 'already_done') {
        const who = game.displayName(res.by);
        toast.info(res.by === user.value?.id ? 'Hast du gerade schon erledigt.' : `Hat ${who} gerade erledigt.`);
        await refreshChore(chore.id);
        return res;
      }
      await refreshChore(chore.id);
      game.announce(res, chore.title);
      toast.undo(`„${chore.title}“ erledigt · +${res.xp} XP`, () => undo(res.completion_id!));
      game.refresh();
      return res;
    } catch (e) {
      toast.error('Aufgabe konnte nicht abgehakt werden.', e);
      return null;
    } finally {
      const next = new Set(completing.value);
      next.delete(chore.id);
      completing.value = next;
    }
  };

  const refreshChore = async (id: string) => {
    const { data } = await supabase.from('chores').select('*').eq('id', id).maybeSingle();
    if (data) upsertLocal(normalize(data));
  };

  const undo = async (completionId: string) => {
    const done = recent.value.find((r) => r.id === completionId);
    const { error } = await supabase.rpc('undo_chore_completion', { p_completion_id: completionId });
    if (error) {
      const msg = error.message?.includes('superseded')
        ? 'Inzwischen wurde die Aufgabe erneut erledigt.'
        : error.message?.includes('too old')
          ? 'Nur innerhalb von 24 Stunden möglich.'
          : 'Rückgängig fehlgeschlagen.';
      return toast.error(msg, error);
    }
    recent.value = recent.value.filter((r) => r.id !== completionId);
    const choreId = done?.chore_id;
    if (choreId) await refreshChore(choreId);
    else await fetchChores();
    game.refresh();
  };

  // --- Areas ---------------------------------------------------------------

  const addArea = async (name: string, emoji: string) => {
    if (!activeHouseholdId.value || !name.trim()) return null;
    const { data, error } = await supabase
      .from('chore_areas')
      .insert({ name: name.trim(), emoji: emoji || '🏠', sort: areas.value.length, household_id: activeHouseholdId.value })
      .select()
      .single();
    if (error || !data) {
      toast.error('Raum konnte nicht angelegt werden.', error);
      return null;
    }
    if (!areas.value.some((a) => a.id === data.id)) areas.value.push(data as ChoreArea);
    return data as ChoreArea;
  };

  /** Create areas by name (templates); returns name → id. */
  const ensureAreas = async (wanted: { name: string; emoji: string }[]) => {
    const map = new Map(areas.value.map((a) => [a.name.toLowerCase(), a.id]));
    const missing = wanted.filter((w) => !map.has(w.name.toLowerCase()));
    if (missing.length && activeHouseholdId.value) {
      const base = areas.value.length;
      const { data, error } = await supabase
        .from('chore_areas')
        .insert(missing.map((m, i) => ({ ...m, sort: base + i, household_id: activeHouseholdId.value })))
        .select();
      if (error) throw error;
      for (const a of (data ?? []) as ChoreArea[]) {
        if (!areas.value.some((x) => x.id === a.id)) areas.value.push(a);
        map.set(a.name.toLowerCase(), a.id);
      }
    }
    return map;
  };

  const areaById = (id: string | null | undefined) => (id ? areas.value.find((a) => a.id === id) ?? null : null);

  // --- Realtime ------------------------------------------------------------

  const applyRemote = (event: 'INSERT' | 'UPDATE' | 'DELETE', row: any, old: any) => {
    if (event === 'DELETE') {
      chores.value = chores.value.filter((c) => c.id !== old?.id);
      return;
    }
    upsertLocal(normalize(row));
  };

  const applyRemoteCompletion = (event: 'INSERT' | 'UPDATE' | 'DELETE', row: any, old: any) => {
    if (event === 'DELETE') {
      if (!recent.value.some((r) => r.id === old?.id)) return;
      recent.value = recent.value.filter((r) => r.id !== old?.id);
    } else if (!recent.value.some((r) => r.id === row.id)) {
      recent.value = [normalizeCompletion(row), ...recent.value].slice(0, 60);
    }
    game.refreshSoon();
  };

  const addKudosLocal = (completionId: string, k: { user_id: string; emoji: string }) => {
    const c = recent.value.find((r) => r.id === completionId);
    if (!c || c.kudos.some((x) => x.user_id === k.user_id)) return false;
    c.kudos = [...c.kudos, k];
    return true;
  };

  const applyRemoteKudos = (event: 'INSERT' | 'UPDATE' | 'DELETE', row: any) => {
    // Kudos are never removed on their own; a deleted completion takes them along.
    if (event === 'DELETE' || !row) return;
    addKudosLocal(row.completion_id, { user_id: row.user_id, emoji: row.emoji });
    game.refreshSoon();
  };

  /** One kudos per completion and giver; the doer gets +1 coin. */
  const giveKudos = async (completion: ChoreCompletion, emoji: KudosEmoji) => {
    const me = user.value?.id;
    if (!me || completion.user_id === me) return false;
    if (!addKudosLocal(completion.id, { user_id: me, emoji })) return false;
    const { data, error } = await supabase.rpc('give_kudos', { p_completion_id: completion.id, p_emoji: emoji });
    if (error) {
      const c = recent.value.find((r) => r.id === completion.id);
      if (c) c.kudos = c.kudos.filter((k) => k.user_id !== me);
      toast.error('Kudos konnten nicht gesendet werden.', error);
      return false;
    }
    const res = data as { status: string; new_badges?: string[]; quests_done?: unknown[] };
    if (res.status === 'ok') {
      toast.success(`${emoji} an ${game.displayName(completion.user_id)} geschickt · +1 🪙`);
      game.refresh();
    }
    return true;
  };

  const clearChores = () => {
    chores.value = [];
    areas.value = [];
    recent.value = [];
    loaded.value = false;
  };

  // --- Derived -------------------------------------------------------------

  const openChores = computed(() => chores.value.filter((c) => !(c.kind === 'once' && c.completed_at)));

  /** Due or late, and mine or nobody's — drives tab badge and widget. */
  const isDueForMe = (c: Chore) => {
    const f = freshness(c);
    if (!f || f.daysLeft > 0) return false;
    return !c.current_assignee || c.current_assignee === user.value?.id;
  };
  const dueForMe = computed(() => openChores.value.filter(isDueForMe));

  return {
    chores,
    areas,
    recent,
    loading,
    loaded,
    completing,
    openChores,
    dueForMe,
    fetchChores,
    fetchAreas,
    addChore,
    addChores,
    updateChore,
    archiveChore,
    archiveCompletedOnce,
    complete,
    undo,
    addArea,
    ensureAreas,
    areaById,
    applyRemote,
    applyRemoteCompletion,
    applyRemoteKudos,
    giveKudos,
    clearChores,
  };
}

/** `next_due` for a new recurring chore, given when it was last done. */
export function initialNextDue(intervalDays: number, lastDoneDaysAgo: number | null): string {
  const today = todayLocalISO();
  if (lastDoneDaysAgo === null) return today; // "noch nie" → due now
  return addDaysISO(today, Math.max(intervalDays - lastDoneDaysAgo, -intervalDays));
}
