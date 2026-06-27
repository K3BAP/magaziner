/**
 * Shopping-list aisle (category) defaults + the offline keyword dictionary used
 * to auto-categorize new entries.
 *
 * Each household gets a seeded copy of DEFAULT_SHOPPING_CATEGORIES. The seeded
 * rows carry a stable `key` (e.g. 'produce') so the dictionary keeps mapping to
 * the right row even after the user renames it. User-created aisles have no key
 * and are manual-only. Anything the dictionary can't place lands in 'misc'.
 */

export interface ShoppingCategorySeed {
  key: string;
  name: string;
  icon: string;
  position: number;
}

/** Stable fallback key for uncategorized entries. */
export const MISC_CATEGORY_KEY = 'misc';

/** Keep in sync with the DB seed migration (shopping_revamp_seed_and_backfill). */
export const DEFAULT_SHOPPING_CATEGORIES: ShoppingCategorySeed[] = [
  { key: 'produce', name: 'Obst & Gemüse', icon: '🥦', position: 0 },
  { key: 'dairy', name: 'Milchprodukte & Eier', icon: '🧀', position: 1 },
  { key: 'meat', name: 'Fleisch & Fisch', icon: '🥩', position: 2 },
  { key: 'bakery', name: 'Brot & Backwaren', icon: '🥖', position: 3 },
  { key: 'frozen', name: 'Tiefkühl', icon: '🧊', position: 4 },
  { key: 'pantry', name: 'Vorräte & Konserven', icon: '🥫', position: 5 },
  { key: 'drinks', name: 'Getränke', icon: '🥤', position: 6 },
  { key: 'snacks', name: 'Süßes & Snacks', icon: '🍫', position: 7 },
  { key: 'household', name: 'Haushalt & Drogerie', icon: '🧴', position: 8 },
  { key: MISC_CATEGORY_KEY, name: 'Sonstiges', icon: '🛒', position: 9 },
];

/**
 * Keyword → category key. Matched as whole words against a normalized title, so
 * stems like 'apfel' also catch 'apfelsaft' only via the substring pass below.
 * Order within a key is irrelevant; across keys the first match wins (in the
 * iteration order of guessCategoryKey).
 */
const KEYWORD_MAP: Record<string, string[]> = {
  produce: [
    'obst', 'gemüse', 'gemuese', 'salat', 'tomate', 'gurke', 'paprika', 'zwiebel',
    'knoblauch', 'kartoffel', 'möhre', 'moehre', 'karotte', 'apfel', 'äpfel', 'banane',
    'birne', 'orange', 'zitrone', 'limette', 'beere', 'erdbeer', 'himbeer', 'heidelbeer',
    'trauben', 'mango', 'avocado', 'brokkoli', 'broccoli', 'blumenkohl', 'spinat',
    'champignon', 'pilz', 'lauch', 'sellerie', 'ingwer', 'kürbis', 'kuerbis', 'zucchini',
    'aubergine', 'kräuter', 'kraeuter', 'petersilie', 'basilikum', 'rucola',
  ],
  dairy: [
    'milch', 'käse', 'kaese', 'butter', 'joghurt', 'jogurt', 'quark', 'sahne', 'rahm',
    'schmand', 'frischkäse', 'frischkaese', 'mozzarella', 'gouda', 'feta', 'ei', 'eier',
    'margarine', 'pudding', 'skyr',
  ],
  meat: [
    'fleisch', 'hähnchen', 'haehnchen', 'huhn', 'hühnchen', 'pute', 'rind', 'hack',
    'gehacktes', 'wurst', 'schinken', 'salami', 'speck', 'bacon', 'schnitzel', 'steak',
    'frikadelle', 'fisch', 'lachs', 'thunfisch', 'forelle', 'garnele', 'shrimp', 'kabeljau',
  ],
  bakery: [
    'brot', 'brötchen', 'broetchen', 'semmel', 'toast', 'baguette', 'brezel', 'croissant',
    'kuchen', 'gebäck', 'gebaeck', 'knäcke', 'knaecke', 'zwieback',
  ],
  frozen: [
    'tiefkühl', 'tiefkuehl', 'tk', 'pizza', 'pommes', 'eis', 'fischstäbchen',
    'fischstaebchen', 'gefroren',
  ],
  pantry: [
    'nudel', 'pasta', 'spaghetti', 'reis', 'mehl', 'zucker', 'salz', 'pfeffer', 'gewürz',
    'gewuerz', 'öl', 'oel', 'essig', 'konserve', 'dose', 'tomatenmark', 'passierte',
    'bohnen', 'linsen', 'kichererbsen', 'mais', 'haferflocken', 'müsli', 'muesli',
    'cornflakes', 'honig', 'marmelade', 'nutella', 'erdnussbutter', 'ketchup', 'senf',
    'mayo', 'mayonnaise', 'brühe', 'bruehe', 'soße', 'sosse', 'sauce', 'backpulver',
    'hefe', 'vanille',
  ],
  drinks: [
    'wasser', 'sprudel', 'cola', 'limo', 'limonade', 'saft', 'schorle', 'bier', 'wein',
    'sekt', 'kaffee', 'tee', 'milchkaffee', 'energy', 'getränk', 'getraenk', 'spezi',
    'fanta', 'sprite',
  ],
  snacks: [
    'schokolade', 'schoko', 'chips', 'keks', 'kekse', 'gummibär', 'gummibaer', 'bonbon',
    'süßigkeit', 'suessigkeit', 'snack', 'riegel', 'nüsse', 'nuesse', 'popcorn', 'cracker',
    'waffel', 'praline',
  ],
  household: [
    'klopapier', 'toilettenpapier', 'küchenrolle', 'kuechenrolle', 'spülmittel',
    'spuelmittel', 'waschmittel', 'weichspüler', 'weichspueler', 'putzmittel', 'reiniger',
    'shampoo', 'duschgel', 'seife', 'zahnpasta', 'zahnbürste', 'zahnbuerste', 'deo',
    'windel', 'taschentücher', 'taschentuecher', 'müllbeutel', 'muellbeutel', 'alufolie',
    'frischhaltefolie', 'batterie', 'glühbirne', 'gluehbirne', 'tampon', 'binde',
  ],
};

/**
 * Normalize a free-text title for matching: lowercase, trim, collapse umlauts
 * and ß so 'Müsli' and 'Muesli' both hit. Keeps spaces for word matching.
 */
function normalize(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss');
}

const NORMALIZED_KEYWORDS: { keyword: string; key: string }[] = Object.entries(KEYWORD_MAP)
  .flatMap(([key, words]) => words.map((w) => ({ keyword: normalize(w), key })))
  // Longer keywords first so the most specific term wins (e.g. 'frischkaese'
  // before 'kaese').
  .sort((a, b) => b.keyword.length - a.keyword.length);

/**
 * Best-guess aisle key for a shopping entry title. Returns a key from
 * DEFAULT_SHOPPING_CATEGORIES, defaulting to MISC_CATEGORY_KEY when nothing
 * matches.
 */
export function guessCategoryKey(title: string): string {
  const normalized = normalize(title);
  if (!normalized) return MISC_CATEGORY_KEY;

  const words = normalized.split(/[^a-z]+/).filter(Boolean);

  // 1. Whole-word match — most reliable ("Milch", "6 Eier").
  for (const { keyword, key } of NORMALIZED_KEYWORDS) {
    if (words.includes(keyword)) return key;
  }
  // 2. Suffix match — German compounds take their meaning from the last element
  //    ("ApfelSAFT" -> drinks, "OlivenÖL" -> pantry). Keywords are sorted
  //    longest-first, so "Reis" beats "eis" inside "reis".
  for (const { keyword, key } of NORMALIZED_KEYWORDS) {
    if (keyword.length >= 3 && words.some((w) => w.endsWith(keyword))) return key;
  }
  // 3. Substring fallback ("Kartoffeln" contains "kartoffel").
  for (const { keyword, key } of NORMALIZED_KEYWORDS) {
    if (keyword.length >= 4 && normalized.includes(keyword)) return key;
  }
  return MISC_CATEGORY_KEY;
}
