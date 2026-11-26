/**
 * Pure game rules for Aufgaben (XP, freshness, levels).
 *
 * The server is authoritative: `public.complete_chore` computes the real XP and
 * coins. `xpPreview` mirrors that formula only to show "+24 XP" on a row —
 * keep both in sync (see migration `chores_gamification_m1`).
 */
import { daysUntil } from './date';

export type Effort = 'mini' | 'small' | 'medium' | 'large';
export type AssignMode = 'fixed' | 'rotate' | 'fair' | 'open';
export type ChoreKind = 'recurring' | 'once';

export const EFFORT_XP: Record<Effort, number> = { mini: 5, small: 10, medium: 20, large: 40 };
export const EFFORT_LABEL: Record<Effort, string> = { mini: 'Mini', small: 'Klein', medium: 'Mittel', large: 'Groß' };
export const EFFORTS: Effort[] = ['mini', 'small', 'medium', 'large'];

export const ASSIGN_LABEL: Record<AssignMode, string> = {
  fixed: 'Fest',
  rotate: 'Abwechselnd',
  fair: 'Fair',
  open: 'Offen',
};
export const ASSIGN_HINT: Record<AssignMode, string> = {
  fixed: 'Immer dieselbe Person.',
  rotate: 'Nach jedem Erledigen ist die nächste Person dran.',
  fair: 'Dran ist, wer diese Woche am wenigsten XP hat.',
  open: 'Niemand zugeteilt – wer zuerst kommt, bekommt die XP.',
};

export const INTERVAL_PRESETS: { days: number; label: string }[] = [
  { days: 1, label: 'Täglich' },
  { days: 2, label: 'Alle 2 Tage' },
  { days: 3, label: 'Alle 3 Tage' },
  { days: 7, label: 'Wöchentlich' },
  { days: 14, label: 'Alle 2 Wochen' },
  { days: 30, label: 'Monatlich' },
  { days: 90, label: 'Vierteljährlich' },
];

export function intervalLabel(days: number): string {
  const preset = INTERVAL_PRESETS.find((p) => p.days === days);
  if (preset) return preset.label;
  if (days % 7 === 0) return `Alle ${days / 7} Wochen`;
  return `Alle ${days} Tage`;
}

/** Freshness state of a chore, from fresh to rotten. */
export type Freshness = 'fresh' | 'soon' | 'today' | 'due' | 'overdue';

export interface FreshnessInfo {
  state: Freshness;
  /** 0 = just done, 1 = due today, >1 = late. */
  ratio: number;
  /** Days until due (negative = late). */
  daysLeft: number;
}

/** Minimal chore shape the rules need. */
export interface ChoreLike {
  kind: ChoreKind;
  interval_days: number | null;
  next_due: string | null;
  due_date: string | null;
  effort: Effort;
  unpopular: boolean;
  current_assignee: string | null;
}

export function freshness(c: ChoreLike): FreshnessInfo | null {
  if (c.kind === 'recurring' && c.next_due && c.interval_days) {
    const daysLeft = daysUntil(c.next_due);
    const ratio = (c.interval_days - daysLeft) / c.interval_days;
    let state: Freshness;
    if (daysLeft < 0) state = ratio >= 1.5 && daysLeft <= -2 ? 'overdue' : 'due';
    else if (daysLeft === 0) state = 'today';
    else state = ratio >= 0.7 ? 'soon' : 'fresh';
    return { state, ratio, daysLeft };
  }
  if (c.kind === 'once' && c.due_date) {
    const daysLeft = daysUntil(c.due_date);
    let state: Freshness;
    if (daysLeft < 0) state = daysLeft <= -2 ? 'overdue' : 'due';
    else if (daysLeft === 0) state = 'today';
    else state = daysLeft <= 2 ? 'soon' : 'fresh';
    return { state, ratio: daysLeft <= 0 ? 1 - daysLeft : 0, daysLeft };
  }
  return null;
}

export const FRESHNESS_TONE: Record<Freshness, string> = {
  fresh: 'bg-success',
  soon: 'bg-warning',
  today: 'bg-warning',
  due: 'bg-error/60',
  overdue: 'bg-error',
};

export type RewardFlag = 'unpopular' | 'on_time' | 'early' | 'rescue' | 'swap';

export interface XpPreview {
  xp: number;
  coins: number;
  flags: RewardFlag[];
}

/** Same formula as `public.complete_chore`. */
export function xpPreview(c: ChoreLike, doer: string | null | undefined): XpPreview {
  let mult = 1;
  const flags: RewardFlag[] = [];
  if (c.unpopular) {
    mult *= 1.5;
    flags.push('unpopular');
  }
  let red = false;
  if (c.kind === 'recurring' && c.next_due && c.interval_days) {
    const daysLeft = daysUntil(c.next_due);
    const ratio = (c.interval_days - daysLeft) / c.interval_days;
    red = ratio >= 1.5 && daysLeft <= -2;
    if (ratio < 0.5) {
      mult *= 0.5;
      flags.push('early');
    } else if (daysLeft >= 0) {
      mult *= 1.25;
      flags.push('on_time');
    }
  } else if (c.kind === 'once' && c.due_date) {
    const daysLeft = daysUntil(c.due_date);
    red = daysLeft <= -2;
    if (daysLeft >= 0) {
      mult *= 1.25;
      flags.push('on_time');
    }
  }
  if (red && (!c.current_assignee || c.current_assignee !== doer)) {
    mult *= 1.5;
    flags.push('rescue');
  }
  if (c.current_assignee && c.current_assignee !== doer) flags.push('swap');
  // Postgres round() rounds half away from zero; Math.round matches for positives.
  const xp = Math.round(EFFORT_XP[c.effort] * mult);
  return { xp, coins: Math.max(1, Math.round(xp / 5)), flags };
}

export const FLAG_LABEL: Record<RewardFlag, string> = {
  unpopular: 'Unbeliebt +50 %',
  on_time: 'Pünktlich +25 %',
  early: 'Zu früh −50 %',
  rescue: 'Rettung +50 %',
  swap: 'Übernommen',
};

/** Total XP needed to reach `level` (level 1 = 0 XP). */
export function xpForLevel(level: number): number {
  const l = level - 1;
  return 100 * l + 25 * l * (l - 1);
}

export function levelFromXp(xp: number): number {
  let l = 1;
  while (xpForLevel(l + 1) <= xp) l++;
  return l;
}

export interface LevelProgress {
  level: number;
  /** XP collected inside the current level. */
  into: number;
  /** XP the current level spans. */
  span: number;
  /** 0..1 */
  pct: number;
}

export function levelProgress(xp: number): LevelProgress {
  const level = levelFromXp(xp);
  const base = xpForLevel(level);
  const span = xpForLevel(level + 1) - base;
  const into = xp - base;
  return { level, into, span, pct: span ? into / span : 0 };
}

export function levelTitle(level: number): string {
  if (level >= 30) return 'Legende';
  if (level >= 20) return 'Glanzleistung';
  if (level >= 15) return 'Haushalts-Ass';
  if (level >= 10) return 'Putzprofi';
  if (level >= 5) return 'Ordnungsfan';
  return 'Neuling';
}
