<script setup lang="ts">
import { computed, defineAsyncComponent, h } from 'vue';
import { useFinance, type FinanceMember } from '../../composables/useFinance';
import { formatCurrency } from '../../utils/currency';
import { todayLocalISO } from '../../utils/date';
import UserAvatar from '../ui/UserAvatar.vue';
import EmptyState from '../ui/EmptyState.vue';
import SectionHeader from '../ui/SectionHeader.vue';
import { ArrowRightIcon, CheckBadgeIcon } from '@heroicons/vue/24/outline';

// Chart.js stays out of the finance tab's first paint.
const BalanceHistory = defineAsyncComponent({
  loader: () => import('./BalanceHistory.vue'),
  loadingComponent: { render: () => h('div', { class: 'skeleton h-72 rounded-[1.25rem]' }) },
});

const { balances, transactions, loading } = useFinance();

const emit = defineEmits<{
  (e: 'edit-member', member: FinanceMember): void;
  (e: 'settle', s: { amount: number; payerId: string; receiverId: string }): void;
}>();

/**
 * Minimal set of transfers that brings every balance to zero (greedy:
 * biggest debtor pays biggest creditor). Good enough for a household.
 */
const settlements = computed(() => {
  const debtors = balances.value
    .filter((b) => b.balance < -0.005)
    .map((b) => ({ id: b.id, name: b.name, amt: -b.balance }))
    .sort((a, b) => b.amt - a.amt);
  const creditors = balances.value
    .filter((b) => b.balance > 0.005)
    .map((b) => ({ id: b.id, name: b.name, amt: b.balance }))
    .sort((a, b) => b.amt - a.amt);
  const out: { from: string; fromName: string; to: string; toName: string; amount: number }[] = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const pay = Math.min(debtors[i].amt, creditors[j].amt);
    const amount = Math.round(pay * 100) / 100;
    if (amount >= 0.01) {
      out.push({ from: debtors[i].id, fromName: debtors[i].name, to: creditors[j].id, toName: creditors[j].name, amount });
    }
    debtors[i].amt -= pay;
    creditors[j].amt -= pay;
    if (debtors[i].amt < 0.005) i++;
    if (creditors[j].amt < 0.005) j++;
  }
  return out;
});

const monthKey = todayLocalISO().slice(0, 7);
const monthTotal = computed(() =>
  transactions.value
    .filter((t) => t.type === 'expense' && t.date.startsWith(monthKey))
    .reduce((s, t) => s + Number(t.amount), 0),
);
const monthName = new Date().toLocaleDateString('de-DE', { month: 'long' });
</script>

<template>
  <div class="flex flex-col gap-5">
    <div v-if="loading && balances.length === 0" class="grid grid-cols-2 gap-3">
      <div v-for="i in 2" :key="i" class="skeleton h-24 rounded-[1.25rem]" />
    </div>

    <EmptyState v-else-if="balances.length === 0" icon="👥" title="Noch keine Personen" text="Lege an, wer im Haushalt Geld auslegt." />

    <template v-else>
      <div class="surface p-4 flex items-center justify-between">
        <div>
          <div class="text-xs font-semibold text-base-content/55">Ausgaben im {{ monthName }}</div>
          <div class="font-display text-3xl tabular-nums mt-0.5">{{ formatCurrency(monthTotal) }}</div>
        </div>
        <span class="text-4xl" aria-hidden="true">🧾</span>
      </div>

      <section>
        <SectionHeader title="Kontostand" />
        <div class="surface overflow-hidden divide-y divide-base-200">
          <button
            v-for="member in balances"
            :key="member.id"
            type="button"
            class="w-full flex items-center gap-3 px-4 py-3 text-left active:bg-base-200"
            @click="emit('edit-member', member)"
          >
            <UserAvatar :name="member.name" size="md" />
            <span class="flex-1 font-semibold truncate">{{ member.name }}</span>
            <span class="text-right">
              <span
                class="block font-bold tabular-nums"
                :class="member.balance > 0.005 ? 'text-success' : member.balance < -0.005 ? 'text-error' : 'text-base-content/45'"
              >
                {{ member.balance > 0.005 ? '+' : '' }}{{ formatCurrency(member.balance) }}
              </span>
              <span class="block text-xs text-base-content/50">
                {{ member.balance > 0.005 ? 'bekommt' : member.balance < -0.005 ? 'schuldet' : 'ausgeglichen' }}
              </span>
            </span>
          </button>
        </div>
      </section>

      <section v-if="transactions.length > 0">
        <SectionHeader title="Verlauf" />
        <BalanceHistory />
      </section>

      <section>
        <SectionHeader title="Ausgleichen" />
        <div v-if="settlements.length === 0" class="surface p-4 flex items-center gap-3 text-success">
          <CheckBadgeIcon class="h-6 w-6" />
          <span class="font-semibold">Alle sind quitt.</span>
        </div>
        <div v-else class="flex flex-col gap-2">
          <div v-for="s in settlements" :key="s.from + s.to" class="surface p-3 pl-4 flex items-center gap-3">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-1.5 text-sm min-w-0">
                <span class="font-semibold truncate">{{ s.fromName }}</span>
                <ArrowRightIcon class="h-4 w-4 shrink-0 text-base-content/40" />
                <span class="font-semibold truncate">{{ s.toName }}</span>
              </div>
              <div class="font-display text-lg tabular-nums">{{ formatCurrency(s.amount) }}</div>
            </div>
            <button
              type="button"
              class="btn btn-sm btn-success rounded-full"
              @click="emit('settle', { amount: s.amount, payerId: s.from, receiverId: s.to })"
            >
              Erledigt
            </button>
          </div>
          <p class="text-xs text-base-content/50 px-1">
            So viele Überweisungen wie nötig, so wenige wie möglich. „Erledigt“ trägt die Zahlung ein.
          </p>
        </div>
      </section>
    </template>
  </div>
</template>
