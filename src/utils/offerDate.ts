/**
 * Parser for the offer date people put in front of a shopping-list entry —
 * "21.08. Räucherlachs", "Fr. 21.08. Kesselchips".
 *
 * The date deliberately stays part of `shopping_list.title` instead of getting
 * its own column: it is written by simply typing, it should keep working for
 * entries that already exist, and everything derived from it (which bucket the
 * entry lands in, whether it is greyed out) is a pure function of the title and
 * the current day. No migration, no sync, no stale flag.
 */

/** German weekday spellings we accept in front of the date, longest first. */
const WEEKDAY =
  'montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag|mo|di|mi|do|fr|sa|so';

/**
 * Group 1 is the prefix as typed (weekday included), 2/3/4 are day, month and
 * the optional year. The dot **after the month is required** so quantities like
 * "2.5 Liter Milch" don't read as a date. A four-digit year is tried before a
 * two-digit one, otherwise "2026" would parse as '20' plus a leftover "26".
 */
const OFFER_PREFIX_RE = new RegExp(
  `^\\s*((?:(?:${WEEKDAY})\\.?\\s+)?(\\d{1,2})\\.\\s*(\\d{1,2})\\.(?:\\s*(\\d{4}|\\d{2}))?)[\\s,;:.–-]*`,
  'i',
);

/** How far an undated offer may lie in the past before it means *next* year. */
const NEXT_YEAR_GRACE_MS = 60 * 24 * 60 * 60 * 1000;

export interface OfferPrefix {
  /** The prefix exactly as the user typed it, e.g. "Fr. 21.08.". */
  label: string;
  /** Midnight of the offer day, local time. */
  date: Date;
  /** The title with the prefix stripped, e.g. "Kesselchips". */
  rest: string;
}

/** Midnight of `d`'s day, local time — the unit all offer comparisons use. */
export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** `null` for a day/month combination that doesn't exist (31.02., 29.02.2025). */
function makeDate(year: number, month: number, day: number): Date | null {
  const d = new Date(year, month - 1, day);
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) return null;
  return d;
}

/**
 * Pull a leading offer date off `title`, or `null` if there is none. `today` is
 * injectable so the year guess stays deterministic.
 */
export function parseOfferPrefix(title: string, today: Date = new Date()): OfferPrefix | null {
  const match = OFFER_PREFIX_RE.exec(title);
  if (!match) return null;

  const [, label, dayRaw, monthRaw, yearRaw] = match;
  const day = Number(dayRaw);
  const month = Number(monthRaw);

  // A bare date without a product isn't an entry we can do anything with.
  const rest = title.slice(match[0].length).trim();
  if (!rest) return null;

  const todayStart = startOfDay(today);
  let date: Date | null;

  if (yearRaw !== undefined) {
    const year = Number(yearRaw);
    date = makeDate(year < 100 ? 2000 + year : year, month, day);
  } else {
    // No year given: take the next occurrence. Falling back to the following
    // year covers both the turn of the year ("05.01." typed in December) and
    // a 29.02. that the current year doesn't have.
    date = makeDate(todayStart.getFullYear(), month, day);
    if (!date || date.getTime() < todayStart.getTime() - NEXT_YEAR_GRACE_MS) {
      date = makeDate(todayStart.getFullYear() + 1, month, day);
    }
  }

  if (!date) return null;
  return { label: label.trim(), date, rest };
}
