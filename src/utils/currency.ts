/**
 * The Intl instance is hoisted so it is constructed once instead of once per
 * rendered list row.
 */
const EUR = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });

/** 12.5 -> "12,50 €". Tolerates the numeric-as-string values PostgREST returns. */
export function formatCurrency(amount: number | string | null | undefined): string {
  return EUR.format(Number(amount) || 0);
}
