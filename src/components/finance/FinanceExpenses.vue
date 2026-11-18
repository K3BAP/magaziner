<script setup lang="ts">
import { ref, computed } from 'vue';
import { useFinance } from '../../composables/useFinance';
import { useExpenseFilter } from '../../composables/useExpenseFilter';
import { formatCurrency } from '../../utils/currency';
import { parseLocalDate, relativeDayLabel } from '../../utils/date';
import ExpenseFilterBar from './ExpenseFilterBar.vue';
import ExpenseFilterSheet from './ExpenseFilterSheet.vue';
import EmptyState from '../ui/EmptyState.vue';
import Skeleton from '../ui/Skeleton.vue';
import { ArrowsRightLeftIcon, ShoppingBagIcon } from '@heroicons/vue/24/outline';

const { transactions, loading } = useFinance();
const { results, resetFilters } = useExpenseFilter();

const showFilterSheet = ref(false);

const emit = defineEmits<{ (e: 'edit-transaction', transaction: any): void }>();

/** Results grouped by month, keeping the filter's sort order inside. */
const months = computed(() => {
  const groups: { key: string; label: string; total: number; items: any[] }[] = [];
  for (const t of results.value as any[]) {
    const key = t.date.slice(0, 7);
    let g = groups.find((x) => x.key === key);
    if (!g) {
      const label = parseLocalDate(`${key}-01`).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
      g = { key, label, total: 0, items: [] };
      groups.push(g);
    }
    g.items.push(t);
    if (t.type === 'expense') g.total += Number(t.amount);
  }
  return groups;
});
</script>

<template>
  <div>
    <ExpenseFilterBar v-if="transactions.length > 0" @open-filters="showFilterSheet = true" />

    <Skeleton v-if="loading && transactions.length === 0" :rows="6" height="4rem" />

    <EmptyState
      v-else-if="transactions.length === 0"
      icon="💸"
      title="Noch keine Buchungen"
      text="Tippe unten rechts auf „Buchen“, um die erste Ausgabe oder Zahlung einzutragen."
    />

    <EmptyState v-else-if="results.length === 0" compact icon="🔍" title="Keine Treffer" text="Für diese Suche gibt es keine Einträge.">
      <button class="btn btn-sm btn-ghost" @click="resetFilters">Filter zurücksetzen</button>
    </EmptyState>

    <div v-else class="flex flex-col gap-5">
      <section v-for="m in months" :key="m.key">
        <div class="flex items-baseline justify-between px-1 mb-2">
          <h3 class="text-xs font-bold uppercase tracking-wider text-base-content/55">{{ m.label }}</h3>
          <span v-if="m.total" class="text-xs font-semibold text-base-content/55 tabular-nums">{{ formatCurrency(m.total) }}</span>
        </div>
        <div class="surface overflow-hidden divide-y divide-base-200">
          <button
            v-for="trans in m.items"
            :key="trans.id"
            type="button"
            class="w-full flex items-center gap-3 px-4 py-3 text-left active:bg-base-200 transition-colors"
            @click="emit('edit-transaction', trans)"
          >
            <span
              class="h-10 w-10 rounded-2xl flex items-center justify-center shrink-0 text-lg"
              :class="trans.type === 'expense' ? 'bg-primary/10 text-primary' : 'bg-success/10 text-success'"
            >
              <template v-if="trans.type === 'expense'">
                <span v-if="trans.category?.icon">{{ trans.category.icon }}</span>
                <ShoppingBagIcon v-else class="h-5 w-5" />
              </template>
              <ArrowsRightLeftIcon v-else class="h-5 w-5" />
            </span>
            <span class="flex-1 min-w-0">
              <span class="block font-semibold truncate">
                {{ trans.type === 'expense' ? trans.title || 'Ausgabe' : 'Zahlung' }}
              </span>
              <span class="block text-xs text-base-content/55 truncate">
                <template v-if="trans.type === 'expense'">{{ trans.payer?.name ?? '?' }} hat bezahlt</template>
                <template v-else>{{ trans.payer?.name ?? '?' }} → {{ trans.receiver?.name ?? '?' }}</template>
                · {{ relativeDayLabel(trans.date) }}
              </span>
            </span>
            <span class="font-semibold tabular-nums shrink-0" :class="trans.type === 'payment' ? 'text-success' : ''">
              {{ formatCurrency(trans.amount) }}
            </span>
          </button>
        </div>
      </section>
    </div>

    <ExpenseFilterSheet v-if="showFilterSheet" @close="showFilterSheet = false" />
  </div>
</template>
