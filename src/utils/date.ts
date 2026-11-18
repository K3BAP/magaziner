/**
 * Calendar-date helpers. All "dates" in the DB (expiry_date, opened_at,
 * finance date, due_date) are plain `YYYY-MM-DD` strings without a time zone,
 * so they must be built and compared in **local** time.
 *
 * Never use `new Date().toISOString().split('T')[0]` for "today": that is the
 * UTC date and returns yesterday between midnight and 1–2 a.m. in Germany.
 */

const pad = (n: number) => String(n).padStart(2, '0');

/** Local calendar date of `d` as `YYYY-MM-DD`. */
export function toLocalISO(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Today's local date as `YYYY-MM-DD`. */
export function todayLocalISO(): string {
  return toLocalISO(new Date());
}

/** Parse a `YYYY-MM-DD` string as local midnight (not UTC midnight). */
export function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

/** Add `days` to a `YYYY-MM-DD` string. */
export function addDaysISO(iso: string, days: number): string {
  const d = parseLocalDate(iso);
  d.setDate(d.getDate() + days);
  return toLocalISO(d);
}

/** Whole days from today until `iso` (negative = in the past, 0 = today). */
export function daysUntil(iso: string): number {
  const today = parseLocalDate(todayLocalISO());
  const target = parseLocalDate(iso);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

export type ExpiryStatus = 'expired' | 'soon' | 'ok' | 'none';

/** How many days ahead count as "bald fällig". */
export const SOON_DAYS = 14;

export function expiryStatus(iso: string | null | undefined): ExpiryStatus {
  if (!iso) return 'none';
  const diff = daysUntil(iso);
  if (diff < 0) return 'expired';
  if (diff <= SOON_DAYS) return 'soon';
  return 'ok';
}

/** `18.11.26` */
export function formatShortDate(iso: string | null | undefined): string {
  if (!iso) return '';
  return parseLocalDate(iso).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  });
}

/** Human relative label: „heute“, „morgen“, „in 3 Tagen“, „seit 2 Tagen“. */
export function relativeDayLabel(iso: string): string {
  const diff = daysUntil(iso);
  if (diff === 0) return 'heute';
  if (diff === 1) return 'morgen';
  if (diff === -1) return 'gestern';
  if (diff > 1 && diff <= 14) return `in ${diff} Tagen`;
  if (diff < -1 && diff >= -14) return `vor ${-diff} Tagen`;
  return formatShortDate(iso);
}

/** Time-of-day greeting. */
export function greeting(now = new Date()): string {
  const h = now.getHours();
  if (h < 5) return 'Gute Nacht';
  if (h < 11) return 'Guten Morgen';
  if (h < 17) return 'Hallo';
  if (h < 22) return 'Guten Abend';
  return 'Gute Nacht';
}
