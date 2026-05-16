<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useFinance } from '../../composables/useFinance';
import WidgetShell from './WidgetShell.vue';
import {
  BanknotesIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
} from '@heroicons/vue/24/outline';

const { transactions, categories, fetchTransactions, fetchCategories } = useFinance();

onMounted(() => {
  if (transactions.value.length === 0) fetchTransactions();
  if (categories.value.length === 0) fetchCategories();
});

const now = new Date();
const currentYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
const prevYM = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;

const inMonth = (dateStr: string, ym: string) => dateStr.startsWith(ym);

const currentTotal = computed(() =>
  transactions.value
    .filter(t => t.type === 'expense' && inMonth(t.date, currentYM))
    .reduce((s, t) => s + Number(t.amount), 0)
);

const prevTotal = computed(() =>
  transactions.value
    .filter(t => t.type === 'expense' && inMonth(t.date, prevYM))
    .reduce((s, t) => s + Number(t.amount), 0)
);

const deltaPct = computed(() => {
  if (prevTotal.value === 0) return null;
  return ((currentTotal.value - prevTotal.value) / prevTotal.value) * 100;
});

const topCategory = computed(() => {
  const totals: Record<string, number> = {};
  transactions.value
    .filter(t => t.type === 'expense' && inMonth(t.date, currentYM) && t.category_id)
    .forEach(t => { totals[t.category_id!] = (totals[t.category_id!] || 0) + Number(t.amount); });
  const top = Object.entries(totals).sort((a, b) => b[1] - a[1])[0];
  if (!top) return null;
  return categories.value.find(c => c.id === top[0]) || null;
});

const formatEur = (n: number) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
</script>

<template>
  <WidgetShell title="Diesen Monat" :icon="BanknotesIcon" tone="success" clickable>
    <div class="flex items-end gap-2">
      <div class="text-3xl font-bold tabular-nums leading-none">{{ formatEur(currentTotal) }}</div>
    </div>

    <div v-if="deltaPct !== null" class="mt-2 flex items-center gap-1 text-xs">
      <ArrowTrendingUpIcon v-if="deltaPct >= 0" class="h-4 w-4 text-error" />
      <ArrowTrendingDownIcon v-else class="h-4 w-4 text-success" />
      <span :class="deltaPct >= 0 ? 'text-error' : 'text-success'" class="font-semibold tabular-nums">
        {{ deltaPct >= 0 ? '+' : '' }}{{ deltaPct.toFixed(0) }}%
      </span>
      <span class="text-base-content/50">vs. Vormonat</span>
    </div>

    <div v-if="topCategory" class="mt-3">
      <span class="badge badge-ghost badge-sm gap-1">
        <span v-if="topCategory.icon">{{ topCategory.icon }}</span>
        {{ topCategory.name }}
      </span>
    </div>
  </WidgetShell>
</template>
