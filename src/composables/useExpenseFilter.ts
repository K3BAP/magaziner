/**
 * Search + filter state for the finance "Ausgaben" list.
 *
 * State is module-level (like every other composable here) because three
 * components share it: the filter bar reads the query, chips and counts, the
 * filter sheet writes every field, and the list renders `results`. The
 * alternative would be a dozen props and emits threaded through the pane.
 *
 * Everything runs client-side over the `transactions` ref, which already holds
 * the household's complete history — `fetchTransactions` is one unpaginated
 * query and `balances` already walks the whole array on every change, so
 * filtering costs strictly less than what the app does today.
 */

import { computed, ref } from 'vue';
import { useFinance, type FinanceTransaction } from './useFinance';
import { normalize, searchTerms } from '../utils/text';

export type TypeFilter = 'all' | 'expense' | 'payment';
export type PersonRole = 'any' | 'payer' | 'participant';
export type SortKey = 'date' | 'amount' | 'title';
export type SortDir = 'asc' | 'desc';
export type DatePreset = 'none' | 'thisMonth' | 'lastMonth' | 'thisYear' | 'custom';

/** Sentinel id for the "Ohne Kategorie" entry in the category multi-select. */
export const NO_CATEGORY = '__none__';

// --- Shared state ---
const query = ref('');
const typeFilter = ref<TypeFilter>('all');
const categoryIds = ref<string[]>([]); // may contain NO_CATEGORY
const memberIds = ref<string[]>([]);
const personRole = ref<PersonRole>('any');
const datePreset = ref<DatePreset>('none');
const dateFrom = ref(''); // 'YYYY-MM-DD' | ''
const dateTo = ref('');
// Strings, not numbers: an emptied number input yields '' rather than null,
// which would leak into the chip labels. Strings also let German users type
// "12,50" — same pattern as ExpenseWizard's amount field.
const amountMinInput = ref('');
const amountMaxInput = ref('');
const sortKey = ref<SortKey>('date');
const sortDir = ref<SortDir>('desc'); // matches the server's default order

const TYPE_LABELS: Record<TypeFilter, string> = {
  all: 'Alle',
  expense: 'Ausgaben',
  payment: 'Zahlungen',
};
const ROLE_SUFFIX: Record<PersonRole, string> = {
  any: '',
  payer: 'Zahler',
  participant: 'beteiligt',
};
const PRESET_LABELS: Record<DatePreset, string> = {
  none: '',
  custom: '',
  thisMonth: 'Dieser Monat',
  lastMonth: 'Letzter Monat',
  thisYear: 'Dieses Jahr',
};
const SORT_LABELS: Record<SortKey, string> = {
  date: 'Datum',
  amount: 'Betrag',
  title: 'Titel',
};

/**
 * Local-time YYYY-MM-DD. Never toISOString() — that converts to UTC and lands
 * on the previous day for CET/CEST evenings.
 */
const toISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** '2026-08-07' -> '07.08.2026', by string surgery (no Date, no timezone). */
const formatDay = (iso: string) => iso.split('-').reverse().join('.');

const parseAmount = (input: string): number | null => {
  const n = parseFloat(input.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};

/**
 * The label the list actually renders. Also what we sort by, so `title: null`
 * (every payment, plus optional on expenses) never reaches the comparator.
 */
export function displayTitle(t: FinanceTransaction): string {
  return t.type === 'expense' ? t.title?.trim() || 'Ausgabe' : 'Zahlung';
}

export function useExpenseFilter() {
  const { transactions, categories, members } = useFinance();

  const amountMin = computed(() => parseAmount(amountMinInput.value));
  const amountMax = computed(() => parseAmount(amountMaxInput.value));

  // One normalized search string per transaction. Rebuilt only when the
  // transaction list itself changes — not on every keystroke.
  const haystacks = computed(() => {
    const map = new Map<string, string>();
    for (const t of transactions.value) {
      map.set(
        t.id,
        normalize(
          [
            t.title ?? '',
            t.notes ?? '',
            t.payer?.name ?? '', // null once a member was deleted — tolerated
            t.receiver?.name ?? '',
            t.category?.name ?? '',
          ].join(' ')
        )
      );
    }
    return map;
  });

  const terms = computed(() => searchTerms(query.value));

  // Ids that no longer exist (household switch, deleted category or member) are
  // ignored on read, so a stale selection can't silently empty the list.
  const activeCategoryIds = computed(
    () =>
      new Set(
        categoryIds.value.filter(
          (id) => id === NO_CATEGORY || categories.value.some((c) => c.id === id)
        )
      )
  );
  const activeMemberIds = computed(
    () => new Set(memberIds.value.filter((id) => members.value.some((m) => m.id === id)))
  );

  const matches = (t: FinanceTransaction): boolean => {
    if (typeFilter.value !== 'all' && t.type !== typeFilter.value) return false;

    // Every term must appear somewhere (AND, order-independent).
    if (terms.value.length) {
      const hay = haystacks.value.get(t.id) ?? '';
      for (const term of terms.value) if (!hay.includes(term)) return false;
    }

    // Categories are an expense-only concept, so any category selection rules
    // payments out — otherwise they'd all fall into the "Ohne Kategorie" bucket.
    if (activeCategoryIds.value.size) {
      if (t.type !== 'expense') return false;
      if (!activeCategoryIds.value.has(t.category_id ?? NO_CATEGORY)) return false;
    }

    // The PostgREST embeds only select `name`, so there is no `t.payer.id` —
    // always compare the *_id columns.
    if (activeMemberIds.value.size) {
      const isPayer = activeMemberIds.value.has(t.payer_id);
      const isParticipant =
        (t.splits ?? []).some((s) => activeMemberIds.value.has(s.member_id)) ||
        (t.type === 'payment' && !!t.receiver_id && activeMemberIds.value.has(t.receiver_id));
      const ok =
        personRole.value === 'payer'
          ? isPayer
          : personRole.value === 'participant'
            ? isParticipant
            : isPayer || isParticipant;
      if (!ok) return false;
    }

    // `date` is a zero-padded, fixed-width 'YYYY-MM-DD', so string comparison is
    // chronological. Both bounds inclusive.
    if (dateFrom.value && t.date < dateFrom.value) return false;
    if (dateTo.value && t.date > dateTo.value) return false;

    const amount = Number(t.amount); // numeric arrives as a string
    if (amountMin.value !== null && amount < amountMin.value) return false;
    if (amountMax.value !== null && amount > amountMax.value) return false;

    return true;
  };

  const results = computed(() => {
    // `.filter()` always allocates a new array, which is what makes the sort
    // below safe. Never shortcut to `transactions.value` when no filter is
    // active — sorting that in place would reorder the shared module state and
    // corrupt `balances`, the statistics tab and the wizard's suggestions.
    const list = transactions.value.filter(matches);
    const dir = sortDir.value === 'asc' ? 1 : -1;
    list.sort((a, b) => {
      let c: number;
      if (sortKey.value === 'amount') {
        c = Number(a.amount) - Number(b.amount);
      } else if (sortKey.value === 'title') {
        c = displayTitle(a).localeCompare(displayTitle(b), 'de', { sensitivity: 'base' });
      } else {
        c = a.date < b.date ? -1 : a.date > b.date ? 1 : 0;
      }
      if (c !== 0) return c * dir;
      // Stable tie-break, newest first — same secondary order as the server.
      return (b.created_at ?? '').localeCompare(a.created_at ?? '');
    });
    return list;
  });

  const resultCount = computed(() => results.value.length);
  // Kept apart on purpose: adding a 40 € grocery run to a 40 € settlement gives
  // 80 €, which means nothing.
  const sumExpenses = computed(() =>
    results.value.reduce((s, t) => (t.type === 'expense' ? s + Number(t.amount) : s), 0)
  );
  const sumPayments = computed(() =>
    results.value.reduce((s, t) => (t.type === 'payment' ? s + Number(t.amount) : s), 0)
  );

  const applyPreset = (p: Exclude<DatePreset, 'custom'>) => {
    datePreset.value = p;
    if (p === 'none') {
      dateFrom.value = '';
      dateTo.value = '';
      return;
    }
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    if (p === 'thisYear') {
      dateFrom.value = `${y}-01-01`;
      dateTo.value = `${y}-12-31`;
      return;
    }
    const base = p === 'thisMonth' ? m : m - 1; // Date() rolls -1 into last December
    dateFrom.value = toISO(new Date(y, base, 1));
    dateTo.value = toISO(new Date(y, base + 1, 0)); // day 0 = last day of `base`
  };

  /** Editing a date field by hand means the range is no longer a preset. */
  const markCustomRange = () => {
    datePreset.value = 'custom';
  };

  const toggleCategory = (id: string) => {
    const i = categoryIds.value.indexOf(id);
    if (i === -1) categoryIds.value.push(id);
    else categoryIds.value.splice(i, 1);
  };

  const toggleMember = (id: string) => {
    const i = memberIds.value.indexOf(id);
    if (i === -1) memberIds.value.push(id);
    else memberIds.value.splice(i, 1);
  };

  const resetFilters = () => {
    query.value = '';
    typeFilter.value = 'all';
    categoryIds.value = [];
    memberIds.value = [];
    personRole.value = 'any';
    datePreset.value = 'none';
    dateFrom.value = '';
    dateTo.value = '';
    amountMinInput.value = '';
    amountMaxInput.value = '';
    sortKey.value = 'date';
    sortDir.value = 'desc';
  };

  // Free text is not counted — it is visible in the input itself.
  const activeFilterCount = computed(() => {
    let n = 0;
    if (typeFilter.value !== 'all') n++;
    if (activeCategoryIds.value.size) n++;
    if (activeMemberIds.value.size) n++;
    if (dateFrom.value || dateTo.value) n++;
    if (amountMin.value !== null || amountMax.value !== null) n++;
    if (sortKey.value !== 'date' || sortDir.value !== 'desc') n++;
    return n;
  });

  const hasActiveFilters = computed(
    () => activeFilterCount.value > 0 || query.value.trim() !== ''
  );

  const dateRangeLabel = computed(() => {
    if (datePreset.value !== 'custom' && PRESET_LABELS[datePreset.value]) {
      return PRESET_LABELS[datePreset.value];
    }
    if (dateFrom.value && dateTo.value) {
      return `${formatDay(dateFrom.value)} – ${formatDay(dateTo.value)}`;
    }
    if (dateFrom.value) return `ab ${formatDay(dateFrom.value)}`;
    return `bis ${formatDay(dateTo.value)}`;
  });

  const amountRangeLabel = computed(() => {
    const a = amountMin.value;
    const b = amountMax.value;
    if (a !== null && b !== null) return `${a} – ${b} €`;
    if (a !== null) return `ab ${a} €`;
    return `bis ${b} €`;
  });

  const sortLabel = computed(
    () => `${SORT_LABELS[sortKey.value]} ${sortDir.value === 'asc' ? '↑' : '↓'}`
  );

  /**
   * One removable chip per active constraint. `clear` is bound straight to the
   * chip's ✕ so the bar's template stays declarative.
   */
  const activeChips = computed(() => {
    const chips: { key: string; label: string; clear: () => void }[] = [];

    if (typeFilter.value !== 'all') {
      chips.push({
        key: 'type',
        label: TYPE_LABELS[typeFilter.value],
        clear: () => (typeFilter.value = 'all'),
      });
    }

    for (const id of activeCategoryIds.value) {
      const c = categories.value.find((x) => x.id === id);
      chips.push({
        key: `cat:${id}`,
        label: id === NO_CATEGORY ? 'Ohne Kategorie' : `${c?.icon ?? ''} ${c?.name ?? ''}`.trim(),
        clear: () => toggleCategory(id),
      });
    }

    for (const id of activeMemberIds.value) {
      const m = members.value.find((x) => x.id === id);
      const suffix = ROLE_SUFFIX[personRole.value];
      chips.push({
        key: `mem:${id}`,
        label: suffix ? `${m?.name} · ${suffix}` : (m?.name ?? ''),
        clear: () => toggleMember(id),
      });
    }

    if (dateFrom.value || dateTo.value) {
      chips.push({
        key: 'date',
        label: dateRangeLabel.value,
        clear: () => applyPreset('none'),
      });
    }

    if (amountMin.value !== null || amountMax.value !== null) {
      chips.push({
        key: 'amount',
        label: amountRangeLabel.value,
        clear: () => {
          amountMinInput.value = '';
          amountMaxInput.value = '';
        },
      });
    }

    if (sortKey.value !== 'date' || sortDir.value !== 'desc') {
      chips.push({
        key: 'sort',
        label: sortLabel.value,
        clear: () => {
          sortKey.value = 'date';
          sortDir.value = 'desc';
        },
      });
    }

    return chips;
  });

  return {
    query,
    typeFilter,
    personRole,
    datePreset,
    dateFrom,
    dateTo,
    amountMinInput,
    amountMaxInput,
    sortKey,
    sortDir,
    results,
    resultCount,
    sumExpenses,
    sumPayments,
    activeCategoryIds,
    activeMemberIds,
    activeChips,
    activeFilterCount,
    hasActiveFilters,
    applyPreset,
    markCustomRange,
    toggleCategory,
    toggleMember,
    resetFilters,
  };
}
