<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useInventory } from '../composables/useInventory';
import { useTodos } from '../composables/useTodos';

// --- Chart.js Imports & Setup ---
import { Chart as ChartJS, ArcElement, Tooltip, Legend, BarElement, CategoryScale, LinearScale } from 'chart.js';
import { Doughnut, Bar } from 'vue-chartjs';

ChartJS.register(ArcElement, Tooltip, Legend, BarElement, CategoryScale, LinearScale);

const router = useRouter();
const { items, locations } = useInventory(); // addItem nicht mehr nötig hier
const { todos } = useTodos();

// --- 1. Statistik Logik ---

const getExpiryStatus = (dateStr: string | null) => {
  if (!dateStr) return 'ok';
  const today = new Date(); today.setHours(0,0,0,0);
  const expiry = new Date(dateStr);
  const diffTime = expiry.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (86400000));
  
  // Hinweis: Hier ist dein 14-Tage Threshold berücksichtigt
  if (diffDays < 0) return 'expired';
  if (diffDays <= 14) return 'soon';
  return 'ok';
};

// Berechnet die globalen Zahlen für die Widgets
const stats = computed(() => {
  let expired = 0;
  let soon = 0;
  let ok = 0;
  let opened = 0;

  items.value.forEach(item => {
    if (item.instances && item.instances.length > 0) {
      item.instances.forEach(inst => {
        // Status prüfen (MHD)
        const status = getExpiryStatus(inst.expiry_date);
        if (status === 'expired') expired++;
        else if (status === 'soon') soon++;
        else ok++;

        // Status prüfen (Geöffnet)
        if (inst.opened_at) opened++;
      });
    } else {
        ok++; 
    }
  });
  return { expired, soon, ok, opened };
});

const openTodosCount = computed(() => todos.value.filter(t => !t.is_completed).length);
const nextTodo = computed(() => todos.value.find(t => !t.is_completed));

// --- 2. Chart Data ---

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

// --- 3. Detail Modal Logik ---

const detailsDialog = ref<HTMLDialogElement | null>(null);
const detailsTitle = ref('');
// Wir speichern hier generische Objekte für die Liste
const detailsList = ref<{ name: string; date: string; location: string; rawDate?: number }[]>([]);

// Hilfsfunktion: Findet den Ortsnamen
const getLocName = (id: string) => locations.value.find(l => l.id === id)?.name || 'Unbekannt';
const formatDate = (d: string) => new Date(d).toLocaleDateString('de-DE');

// A) Modal für Abgelaufene
const openExpiredDetails = () => {
  if (stats.value.expired === 0) return;

  detailsTitle.value = '⚠️ Bereits abgelaufen';
  detailsList.value = [];

  items.value.forEach(item => {
    item.instances.forEach(inst => {
      if (getExpiryStatus(inst.expiry_date) === 'expired') {
        detailsList.value.push({
          name: item.name,
          date: inst.expiry_date ? formatDate(inst.expiry_date) : '?',
          location: getLocName(item.location_id)
        });
      }
    });
  });
  
  detailsDialog.value?.showModal();
};

// B) Modal für Bald fällige
const openSoonDetails = () => {
  if (stats.value.soon === 0) return;

  detailsTitle.value = '⏳ Bald fällig (14 Tage)';
  detailsList.value = [];

  items.value.forEach(item => {
    item.instances.forEach(inst => {
      if (getExpiryStatus(inst.expiry_date) === 'soon') {
        detailsList.value.push({
          name: item.name,
          date: inst.expiry_date ? formatDate(inst.expiry_date) : '?',
          location: getLocName(item.location_id)
        });
      }
    });
  });

  detailsDialog.value?.showModal();
};

// C) Modal für Geöffnete (NEU)
const openOpenedDetails = () => {
  if (stats.value.opened === 0) return;
  
  detailsTitle.value = '🥄 Geöffnete Produkte';
  detailsList.value = [];

  items.value.forEach(item => {
    item.instances.forEach(inst => {
      if (inst.opened_at) {
        detailsList.value.push({
          name: item.name,
          date: `Seit: ${formatDate(inst.opened_at)}`,
          rawDate: new Date(inst.opened_at).getTime(),
          location: getLocName(item.location_id)
        });
      }
    });
  });
  
  // Sortieren: Neueste zuerst geöffnet
  detailsList.value.sort((a, b) => (b.rawDate || 0) - (a.rawDate || 0));
  
  detailsDialog.value?.showModal();
};

// Navigation
const goTodos = () => router.push({ name: 'todos' });
const goLocations = () => router.push({ name: 'locations' });

</script>

<template>
  <div class="flex flex-col gap-6 pb-10">
    
    <div>
       <h1 class="text-2xl font-bold">Hallo! 👋</h1>
       <p class="text-gray-500">Hier ist dein aktueller Überblick.</p>
    </div>

    <div class="grid grid-cols-2 gap-4">
       
       <div 
         class="card bg-base-100 shadow-md transition-all"
         :class="stats.expired > 0 ? 'cursor-pointer hover:shadow-lg hover:bg-red-50' : 'opacity-60'"
         @click="openExpiredDetails"
       >
         <div class="card-body p-4 items-center text-center">
            <div class="text-3xl">⚠️</div>
            <div class="text-2xl font-bold text-error">{{ stats.expired }}</div>
            <div class="text-xs text-gray-500">Abgelaufen</div>
         </div>
       </div>

       <div 
         class="card bg-base-100 shadow-md transition-all"
         :class="stats.soon > 0 ? 'cursor-pointer hover:shadow-lg hover:bg-yellow-50' : 'opacity-60'"
         @click="openSoonDetails"
       >
         <div class="card-body p-4 items-center text-center">
            <div class="text-3xl">⏳</div>
            <div class="text-2xl font-bold text-warning">{{ stats.soon }}</div>
            <div class="text-xs text-gray-500">Bald fällig</div>
         </div>
       </div>

       <div 
         class="card bg-base-100 shadow-md transition-all col-span-2"
         :class="stats.opened > 0 ? 'cursor-pointer hover:shadow-lg hover:bg-blue-50' : 'opacity-60'"
         @click="openOpenedDetails"
       >
         <div class="card-body p-4 flex-row items-center justify-between">
            <div class="text-left">
               <div class="text-2xl font-bold text-info">{{ stats.opened }}</div>
               <div class="text-xs text-gray-500">Produkte geöffnet</div>
            </div>
            <div class="text-3xl">🥄</div>
         </div>
       </div>

    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
       
       <div class="card bg-base-100 shadow-md">
          <div class="card-body p-4">
             <h3 class="card-title text-sm uppercase text-gray-400">Zustand der Vorräte</h3>
             <div class="h-48 relative">
                <Doughnut :data="doughnutData" :options="doughnutOptions" />
             </div>
          </div>
       </div>

       <div class="card bg-base-100 shadow-md cursor-pointer hover:bg-base-200 transition-colors" @click="goTodos">
          <div class="card-body p-4">
             <div class="flex justify-between items-start">
                <div>
                   <h3 class="card-title text-sm uppercase text-gray-400">Offene Aufgaben</h3>
                   <div class="text-4xl font-bold mt-2">{{ openTodosCount }}</div>
                </div>
                <div class="btn btn-circle btn-sm btn-ghost bg-base-200">
                   📝
                </div>
             </div>
             
             <div v-if="nextTodo" class="mt-4 p-3 bg-base-200 rounded-lg text-sm flex items-center gap-2">
                <span class="badge badge-primary badge-xs">Next</span>
                <span class="truncate font-medium">{{ nextTodo.title }}</span>
             </div>
             <div v-else class="mt-4 text-sm text-gray-400">
                Alles erledigt! 🎉
             </div>
          </div>
       </div>
    </div>

    <div class="card bg-base-100 shadow-md cursor-pointer hover:bg-base-200 transition-colors" @click="goLocations">
       <div class="card-body p-4">
          <h3 class="card-title text-sm uppercase text-gray-400">Lagerbestand pro Ort</h3>
          <div class="h-48 relative">
             <Bar :data="barData" :options="barOptions" />
          </div>
       </div>
    </div>

    <dialog ref="detailsDialog" class="modal modal-bottom sm:modal-middle">
      <div class="modal-box">
        <h3 class="font-bold text-lg mb-4 sticky top-0 bg-base-100 pt-2">{{ detailsTitle }}</h3>
        
        <div class="flex flex-col gap-2 max-h-[60vh] overflow-y-auto">
           <div v-for="(item, idx) in detailsList" :key="idx" class="flex justify-between items-center p-3 bg-base-200 rounded-lg">
              <div>
                 <div class="font-bold">{{ item.name }}</div>
                 <div class="text-xs opacity-70">📍 {{ item.location }}</div>
              </div>
              <div class="text-sm font-mono bg-base-100 px-2 py-1 rounded border border-base-300">
                 {{ item.date }}
              </div>
           </div>
           
           <div v-if="detailsList.length === 0" class="text-center opacity-50 py-4">
              Keine Einträge.
           </div>
        </div>

        <div class="modal-action">
          <form method="dialog">
            <button class="btn btn-primary">Verstanden</button>
          </form>
        </div>
      </div>
    </dialog>

  </div>
</template>