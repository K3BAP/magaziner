<script setup lang="ts">
import { computed } from 'vue';
import { Chart as ChartJS, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js';
import { Bar } from 'vue-chartjs';
import { useInventory } from '../../composables/useInventory';
import { useThemeColors } from '../../composables/useThemeColors';
import { ChartBarIcon } from '@heroicons/vue/24/outline';
import WidgetShell from './WidgetShell.vue';

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const { items, locations } = useInventory();
const { read } = useThemeColors();

const barData = computed(() => ({
  labels: locations.value.map(l => l.name),
  datasets: [{
    label: 'Anzahl Produkte',
    backgroundColor: read('--color-primary', '#66cc8a'),
    borderRadius: 6,
    data: locations.value.map(loc => items.value.filter(i => i.location_id === loc.id).length),
  }],
}));

const barOptions = computed(() => {
  const labelColor = read('--color-base-content', '#1f2937');
  const gridColor = read('--color-base-300', '#e5e7eb');
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { ticks: { color: labelColor, font: { size: 10 } }, grid: { display: false } },
      y: { ticks: { color: labelColor, font: { size: 10 } }, grid: { color: gridColor } },
    },
  };
});
</script>

<template>
  <WidgetShell title="Lagerbestand pro Ort" :icon="ChartBarIcon" tone="primary" clickable>
    <div class="h-48 relative w-full">
      <Bar :data="barData" :options="barOptions" />
    </div>
  </WidgetShell>
</template>
