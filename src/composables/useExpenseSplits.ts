import { ref, watch, type Ref } from 'vue';
import type { FinanceMember, FinanceSplit } from './useFinance';

/**
 * Per-member split row as rendered in the form. We keep `amount` as a string
 * so the user's literal input ("12.50", "0,00") survives a round-trip through
 * the `<input>` without being mangled by `toFixed` on every keystroke.
 */
export interface UISplit {
  memberId: string;
  name: string;
  amount: string;
  percentage: number;
  active: boolean;
}

/**
 * Form-side state for expense splits — the equal-split default, the keep-the-
 * total-balanced redistribution, the rounding fix-up before save, and edit-
 * mode hydration. Both the create wizard and the legacy edit modal use this
 * so the math only lives in one place.
 *
 *   const { splits, initEqual, onFieldEdit, onActiveToggle, finaliseForSave }
 *     = useExpenseSplits(members, amountRef);
 *
 * `amount` is read as a Ref so callers can pass a `computed(() => ...)` that
 * coerces their form's `number | null` into a real number — the composable
 * NaN-guards every read.
 */
export function useExpenseSplits(
  members: Ref<FinanceMember[]>,
  amount: Ref<number>
) {
  const splits = ref<UISplit[]>([]);

  const safeTotal = () => (Number.isFinite(amount.value) ? amount.value : 0);

  /** Replace splits with an equal split across all members, all active. */
  const initEqual = () => {
    const count = members.value.length;
    if (count === 0) {
      splits.value = [];
      return;
    }
    const equalPercent = 100 / count;
    const total = safeTotal();
    const equalAmount = total / count;
    splits.value = members.value.map((m) => ({
      memberId: m.id,
      name: m.name,
      active: true,
      percentage: Number(equalPercent.toFixed(2)),
      amount: equalAmount.toFixed(2),
    }));
  };

  /**
   * Edit-mode hydration: start from an equal split, then overlay the saved
   * per-member values. Members that weren't part of the original transaction
   * end up inactive.
   */
  const hydrateFrom = (existing: FinanceSplit[] | undefined) => {
    initEqual();
    if (!existing || existing.length === 0) return;
    const total = safeTotal();
    splits.value.forEach((s) => {
      const db = existing.find((e) => e.member_id === s.memberId);
      if (db) {
        s.active = true;
        s.amount = db.split_amount.toFixed(2);
        s.percentage =
          db.split_percentage ?? (total > 0 ? (db.split_amount / total) * 100 : 0);
      } else {
        s.active = false;
        s.amount = '0.00';
        s.percentage = 0;
      }
    });
  };

  /**
   * Redistribute the remaining percentage across the other active rows so the
   * total still sums to 100. Preserves the relative weights of the others when
   * there's already a non-zero distribution; otherwise spreads equally.
   */
  const distributeRest = (sourceId: string | null, newTotalPercent: number) => {
    const total = safeTotal();
    const active = splits.value.filter((s) => s.active);
    const others = active.filter((s) => s.memberId !== sourceId);
    if (others.length === 0) return;
    const currentOthersTotalPercent = others.reduce((acc, s) => acc + s.percentage, 0);
    const remainingPercent = 100 - newTotalPercent;
    const ratio =
      currentOthersTotalPercent > 0 ? remainingPercent / currentOthersTotalPercent : 0;
    const useEqual = currentOthersTotalPercent === 0;
    others.forEach((s) => {
      s.percentage = useEqual ? remainingPercent / others.length : s.percentage * ratio;
      const amt = (s.percentage / 100) * total;
      s.percentage = Number(s.percentage.toFixed(2));
      s.amount = amt.toFixed(2);
    });
  };

  /** Reacts to the user editing one split's € or % field. */
  const onFieldEdit = (split: UISplit, field: 'amount' | 'percentage') => {
    const total = safeTotal();
    if (field === 'amount') {
      const numAmount = Number(split.amount);
      split.percentage = total > 0 ? (numAmount / total) * 100 : 0;
      split.percentage = Number(split.percentage.toFixed(2));
    } else {
      const amt = (split.percentage / 100) * total;
      split.amount = amt.toFixed(2);
    }
    distributeRest(split.memberId, split.percentage);
  };

  /** Re-equalise across the currently-active rows when one is toggled. */
  const onActiveToggle = () => {
    const active = splits.value.filter((s) => s.active);
    if (active.length === 0) return;
    const equalPercent = 100 / active.length;
    const total = safeTotal();
    splits.value.forEach((s) => {
      if (s.active) {
        s.percentage = Number(equalPercent.toFixed(2));
        const amt = (equalPercent / 100) * total;
        s.amount = amt.toFixed(2);
      } else {
        s.percentage = 0;
        s.amount = '0.00';
      }
    });
  };

  // When the overall amount changes, scale the € figures so the percentages
  // stay fixed. We only update the visible €; the % column is the source of truth.
  watch(amount, (newVal) => {
    const total = Number.isFinite(newVal) ? newVal : 0;
    splits.value.forEach((s) => {
      const amt = (s.percentage / 100) * total;
      s.amount = amt.toFixed(2);
    });
  });

  /**
   * Produce the array shape `addTransaction` / `updateTransaction` expect.
   * Mutates the first active split's € by the last-cent rounding delta so
   * the parts always sum to exactly `amount` even after `toFixed(2)`.
   */
  const finaliseForSave = () => {
    const active = splits.value.filter((s) => s.active);
    const total = safeTotal();
    const currentTotal = active.reduce((acc, s) => acc + Number(s.amount), 0);
    const diff = total - currentTotal;
    if (Math.abs(diff) > 0.001 && active.length > 0) {
      const newValue = Number(active[0].amount) + diff;
      active[0].amount = newValue.toFixed(2);
    }
    return active.map((s) => ({
      member_id: s.memberId,
      amount: Number(s.amount),
      percentage: s.percentage,
    }));
  };

  return {
    splits,
    initEqual,
    hydrateFrom,
    onFieldEdit,
    onActiveToggle,
    finaliseForSave,
  };
}
