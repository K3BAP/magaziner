/**
 * Shared text-matching helpers.
 *
 * Lives here rather than next to a single caller because the shopping-list
 * auto-categorizer and the finance search must fold strings identically —
 * two slightly different `normalize`s would be a silent source of "why does
 * this match there but not here".
 */

/**
 * Normalize a free-text title for matching: lowercase, trim, collapse umlauts
 * and ß so 'Müsli' and 'Muesli' both hit. Keeps spaces for word matching.
 */
export function normalize(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss');
}

/**
 * Split a free-text query into normalized terms. Callers are expected to
 * require *all* terms (AND), order-independent: 'rewe mai' finds
 * 'Mai-Einkauf bei Rewe'.
 */
export function searchTerms(query: string): string[] {
  return normalize(query).split(/\s+/).filter(Boolean);
}
