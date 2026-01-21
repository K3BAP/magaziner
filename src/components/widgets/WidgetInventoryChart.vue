<script setup lang="ts">
import { computed } from 'vue';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'vue-chartjs';
import { useDashboardStats } from '../../composables/useDashboardStats';

ChartJS.register(ArcElement, Tooltip, Legend);

const { stats } = useDashboardStats();

const doughnutData = computed(() => ({
  labels: ['Abgelaufen', 'Bald fällig', 'OK'],
  datasets: [{
    backgroundColor: ['#f87272', '#fbbd23', '#36d399'],
    data: [stats.value.expired, stats.value.soon, stats.value.ok]
  }]
}));

const doughnutOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { position: 'bottom' as const } }
};
</script>

<template>
  <div class="card bg-base-100 shadow-md h-full">
     <div class="card-body p-4">
        <h3 class="card-title text-sm uppercase text-gray-400">Zustand der Vorräte</h3>
        <div class="h-48 relative">
           <Doughnut :data="doughnutData" :options="doughnutOptions" />
        </div>
     </div>
  </div>
</template>
