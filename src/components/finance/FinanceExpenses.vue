<script setup lang="ts">
import { useFinance } from '../../composables/useFinance';

const { transactions, loading } = useFinance();

const emit = defineEmits<{
  (e: 'edit-transaction', transaction: any): void
}>();

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount);
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
};
</script>

<template>
  <div class="h-full overflow-y-auto pb-24">
    <div v-if="loading && transactions.length === 0" class="flex justify-center p-10">
      <span class="loading loading-spinner loading-lg text-primary"></span>
    </div>

    <div v-else-if="transactions.length === 0" class="flex flex-col items-center justify-center h-full p-10 opacity-50 text-center">
      <div class="text-6xl mb-4">💸</div>
      <h3 class="font-bold text-lg">Keine Ausgaben</h3>
      <p>Tippe auf +, um Ausgaben einzutragen.</p>
    </div>

    <div v-else class="divide-y divide-base-200">
      <div 
        v-for="trans in transactions" 
        :key="trans.id" 
        @click="emit('edit-transaction', trans)"
        class="flex p-4 bg-base-100 hover:bg-base-50 transition-colors cursor-pointer justify-between items-center"
      >
        <!-- Left: Icon & Info -->
        <div class="flex items-center gap-3">
           <div 
             class="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
             :class="trans.type === 'expense' ? 'bg-primary/10 text-primary' : 'bg-success/10 text-success'"
           >
              <!-- Expense Icon -->
              <svg v-if="trans.type === 'expense'" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
              <!-- Payment Icon -->
              <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
           </div>
           
           <div>
              <div class="font-bold text-sm">
                <!-- Title for Expense, or "Payment" -->
                {{ trans.type === 'expense' ? trans.title || 'Ausgabe' : 'Zahlung' }}
                <span v-if="trans.type === 'expense' && trans.category" class="ml-1">{{ trans.category.icon }}</span>
              </div>
              <div class="text-xs text-gray-500">
                 <span class="font-medium text-gray-700">{{ trans.payer?.name ?? '?' }}</span>
                 
                 <span v-if="trans.type === 'expense'"> bezahlte {{ formatCurrency(trans.amount) }}</span>
                 <span v-else> an <span class="font-medium text-gray-700">{{ trans.receiver?.name ?? '?' }}</span></span>
              </div>
           </div>
        </div>

        <!-- Right: Amount & Date -->
        <div class="text-right">
           <div 
             class="font-bold"
             :class="trans.type === 'payment' ? 'text-success' : 'text-base-content'"
           >
             {{ trans.type === 'payment' ? '→' : '' }} {{ formatCurrency(trans.amount) }}
           </div>
           <div class="text-xs text-gray-400">
             {{ formatDate(trans.date) }}
           </div>
        </div>

      </div>
    </div>
  </div>
</template>
