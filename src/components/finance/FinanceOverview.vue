<script setup lang="ts">
import { computed } from 'vue';
import { useFinance, type FinanceMember } from '../../composables/useFinance';

const { balances, loading } = useFinance();

const emit = defineEmits<{
  (e: 'edit-member', member: FinanceMember): void
}>();

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount);
};
</script>

<template>
  <div class="h-full overflow-y-auto pb-24">
    <div v-if="loading" class="flex justify-center p-10">
      <span class="loading loading-spinner loading-lg text-primary"></span>
    </div>

    <div v-else-if="balances.length === 0" class="flex flex-col items-center justify-center h-full p-10 opacity-50 text-center">
      <div class="text-6xl mb-4">👥</div>
      <h3 class="font-bold text-lg">Keine Mitglieder</h3>
      <p>Füge Personen hinzu, um zu starten.</p>
    </div>

    <div v-else class="flex flex-col gap-2 p-4">
      <div 
        v-for="member in balances" 
        :key="member.id" 
        @click="emit('edit-member', member)"
        class="card bg-base-100 shadow-sm border border-base-200 cursor-pointer hover:bg-base-50 transition-colors"
      >
        <div class="card-body p-4 flex-row justify-between items-center">
          <div class="flex items-center gap-3">
             <span class="font-bold text-lg">{{ member.name }}</span>
          </div>

          <div class="text-right">
             <div 
               class="font-bold text-lg"
               :class="{
                 'text-success': member.balance > 0,
                 'text-error': member.balance < 0,
                 'text-gray-400': member.balance === 0
               }"
             >
               {{  member.balance > 0 ? '+' : '' }}{{ formatCurrency(member.balance) }}
             </div>
             <div class="text-xs text-gray-500">
               <span v-if="member.balance > 0">bekommt</span>
               <span v-else-if="member.balance < 0">schuldet</span>
               <span v-else>ausgeglichen</span>
             </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
