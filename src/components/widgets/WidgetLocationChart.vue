<script setup lang="ts">
import { computed } from 'vue';
import { Chart as ChartJS, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js';
import { Bar } from 'vue-chartjs';
import { useInventory } from '../../composables/useInventory';

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const { items, locations } = useInventory();

const barData = computed(() => {
  const data = locations.value.map(loc => {
    return items.value.filter(i => i.location_id === loc.id).length;
  });
  
  return {
    labels: locations.value.map(l => l.name),
    datasets: [{
      label: 'Anzahl Produkte',
      backgroundColor: '#66cc8a',
      data: data
    }]
  };
});

const barOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } }
};

const goLocations = () => {
    // Basic navigation or emit event needs to be handled? 
    // For now, let's keep it simple or emit. Ideally widgets should emit 'navigate'.
    // But router is available here too.
    // Let's use router for direct navigation to keep it standalone for now.
    import('vue-router').then(({ useRouter }) => {
        useRouter().push({ name: 'locations' });
    });
};
</script>

<!-- Note: Dynamic import of router inside generic script block is tricky in setup. 
Let's use standard import. -->
<script lang="ts">
import { useRouter } from 'vue-router';
</script>

<template>
  <div class="card bg-base-100 shadow-md cursor-pointer hover:bg-base-200 transition-colors h-full" @click="$router.push({ name: 'locations' })">
     <div class="card-body p-4">
        <h3 class="card-title text-sm uppercase text-gray-400">Lagerbestand pro Ort</h3>
        <div class="h-48 relative">
           <Bar :data="barData" :options="barOptions" />
        </div>
     </div>
  </div>
</template>
