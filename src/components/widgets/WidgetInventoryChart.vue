<script setup lang="ts">
import { computed } from 'vue';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'vue-chartjs';
import { useDashboardStats } from '../../composables/useDashboardStats';
import { useThemeColors } from '../../composables/useThemeColors';
import { ChartPieIcon } from '@heroicons/vue/24/outline';
import WidgetShell from './WidgetShell.vue';

ChartJS.register(ArcElement, Tooltip, Legend);

const { stats } = useDashboardStats();
const { read } = useThemeColors();

const doughnutData = computed(() => ({
  labels: ['Abgelaufen', 'Bald fällig', 'OK'],
  datasets: [{
    backgroundColor: [
      read('--color-error', '#f87272'),
      read('--color-warning', '#fbbd23'),
      read('--color-success', '#36d399'),
    ],
    borderColor: read('--color-base-100', '#ffffff'),
    borderWidth: 2,
    data: [stats.value.expired, stats.value.soon, stats.value.ok],
  }],
}));

const doughnutOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom' as const,
      labels: { color: read('--color-base-content', '#1f2937'), font: { size: 11 } },
    },
  },
}));
</script>

<template>
  <WidgetShell title="Zustand der Vorräte" :icon="ChartPieIcon" tone="success">
    <div class="h-48 relative w-full">
      <Doughnut :data="doughnutData" :options="doughnutOptions" />
    </div>
  </WidgetShell>
</template>
