/**
 * Scale a free-text ingredient quantity ("200 g", "1/2 TL", "1,5 l", "½ Bund")
 * by `factor`. Only the leading number is touched; text without a number
 * („eine Prise“, „nach Geschmack“) is returned unchanged.
 */

const UNICODE_FRACTIONS: Record<string, number> = {
  '½': 0.5,
  '⅓': 1 / 3,
  '⅔': 2 / 3,
  '¼': 0.25,
  '¾': 0.75,
  '⅛': 0.125,
};

const NUMBER = /^\s*(\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:[.,]\d+)?\s*[½⅓⅔¼¾⅛]?|[½⅓⅔¼¾⅛])/;

function parseLeading(raw: string): number | null {
  let s = raw.trim();
  // "1 1/2"
  const mixed = s.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) return Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]);
  const frac = s.match(/^(\d+)\/(\d+)$/);
  if (frac) return Number(frac[1]) / Number(frac[2]);
  let extra = 0;
  const last = s.slice(-1);
  if (UNICODE_FRACTIONS[last] !== undefined) {
    extra = UNICODE_FRACTIONS[last];
    s = s.slice(0, -1).trim();
    if (!s) return extra;
  }
  const n = Number(s.replace(',', '.'));
  return Number.isFinite(n) ? n + extra : null;
}

function format(n: number): string {
  // Friendly fractions for small kitchen amounts.
  const whole = Math.floor(n);
  const rest = n - whole;
  const nice: [number, string][] = [
    [0.25, '¼'],
    [1 / 3, '⅓'],
    [0.5, '½'],
    [2 / 3, '⅔'],
    [0.75, '¾'],
  ];
  if (n < 10) {
    for (const [v, sym] of nice) {
      if (Math.abs(rest - v) < 0.02) return whole ? `${whole}${sym}` : sym;
    }
  }
  const rounded = n >= 100 ? Math.round(n / 5) * 5 : n >= 10 ? Math.round(n) : Math.round(n * 10) / 10;
  return String(rounded).replace('.', ',');
}

export function scaleQuantity(quantity: string | null | undefined, factor: number): string {
  if (!quantity) return '';
  if (factor === 1) return quantity;
  const m = quantity.match(NUMBER);
  if (!m) return quantity;
  const value = parseLeading(m[1]);
  if (value === null) return quantity;
  return format(value * factor) + quantity.slice(m[0].length).replace(/^(?=\S)/, ' ');
}
