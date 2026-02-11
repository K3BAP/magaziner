<script setup lang="ts">
import { ref, computed } from 'vue';
import { useFinance } from '../../composables/useFinance';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, BarElement, CategoryScale, LinearScale } from 'chart.js';
import { Pie, Bar } from 'vue-chartjs';

ChartJS.register(ArcElement, Tooltip, Legend, BarElement, CategoryScale, LinearScale);

const { transactions, categories } = useFinance();

const selectedYear = ref(new Date().getFullYear());
const selectedCategory = ref('');

const availableYears = computed(() => {
  const years = new Set(transactions.value.map(t => new Date(t.date).getFullYear()));
  years.add(new Date().getFullYear());
  return Array.from(years).sort((a, b) => b - a);
});

const filteredTransactions = computed(() => {
  return transactions.value.filter(t => {
    return t.type === 'expense' && new Date(t.date).getFullYear() === selectedYear.value;
  });
});

// --- Pie Chart: Categories ---
const categoryStats = computed(() => {
  const stats: Record<string, number> = {};
  filteredTransactions.value.forEach(t => {
    const catName = t.category?.name || 'Unkategorisiert';
    stats[catName] = (stats[catName] || 0) + Number(t.amount);
  });
  return stats;
});

const pieData = computed(() => ({
  labels: Object.keys(categoryStats.value),
  datasets: [{
    backgroundColor: ['#41B883', '#E46651', '#00D8FF', '#DD1B16', '#FFCE56', '#8e44ad', '#3498db'],
    data: Object.values(categoryStats.value)
  }]
}));

const pieOptions = {
  responsive: true,
  maintainAspectRatio: false
};

// --- Bar Chart: Monthly ---
const monthlyStats = computed(() => {
  const stats = new Array(12).fill(0);
  filteredTransactions.value.forEach(t => {
    if (selectedCategory.value && t.category_id !== selectedCategory.value) return;
    
    const month = new Date(t.date).getMonth(); // 0-11
    stats[month] += Number(t.amount);
  });
  return stats;
});

const barData = computed(() => ({
  labels: ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'],
  datasets: [{
    label: 'Ausgaben (€)',
    backgroundColor: '#3b82f6',
    data: monthlyStats.value
  }]
}));

const barOptions = {
  responsive: true,
  maintainAspectRatio: false
};

</script>

<template>
  <div class="h-full overflow-y-auto pb-24 p-4">
    
    <!-- Year Filter -->
    <div class="flex justify-center mb-6 gap-2">
      <select v-model="selectedYear" class="select select-bordered select-sm">
        <option v-for="year in availableYears" :key="year" :value="year">{{ year }}</option>
      </select>
    </div>

    <!-- Charts -->
    <div class="grid grid-cols-1 gap-8">
       
       <!-- Category Pie -->
       <div class="card bg-base-100 shadow-sm p-4 border border-base-200">
         <h3 class="font-bold text-center mb-4">Nach Kategorie</h3>
         <div class="h-64 relative">
            <Pie v-if="Object.keys(categoryStats).length > 0" :data="pieData" :options="pieOptions" />
            <div v-else class="flex items-center justify-center h-full text-gray-400">Keine Daten</div>
         </div>
       </div>

       <!-- Monthly Bar -->
       <div class="card bg-base-100 shadow-sm p-4 border border-base-200">
         <div class="flex justify-between items-center mb-4">
            <h3 class="font-bold">Verlauf</h3>
            <select v-model="selectedCategory" class="select select-bordered select-xs w-40">
                <option value="">Alle Kategorien</option>
                <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.icon }} {{ c.name }}</option>
            </select>
         </div>
         <div class="h-64 relative">
            <Bar :data="barData" :options="barOptions" />
         </div>
       </div>

    </div>
  </div>
</template>
