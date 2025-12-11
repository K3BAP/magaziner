<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useInventory, type ItemInstance } from '../composables/useInventory';
import { useTodos } from '../composables/useTodos';

// --- Chart.js Imports & Setup ---
import { Chart as ChartJS, ArcElement, Tooltip, Legend, BarElement, CategoryScale, LinearScale } from 'chart.js';
import { Doughnut, Bar } from 'vue-chartjs';

ChartJS.register(ArcElement, Tooltip, Legend, BarElement, CategoryScale, LinearScale);

const router = useRouter();
const { items, locations, categories, addItem, addCategory, fetchInventory } = useInventory();
const { todos, addTodo, fetchTodos } = useTodos();

// --- 1. Statistik Logik ---

// Helper: Datum prüfen
const getExpiryStatus = (dateStr: string | null) => {
  if (!dateStr) return 'ok';
  const today = new Date(); today.setHours(0,0,0,0);
  const expiry = new Date(dateStr);
  const diffTime = expiry.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (86400000));
  
  if (diffDays < 0) return 'expired';
  if (diffDays <= 7) return 'soon';
  return 'ok';
};

// Zähler berechnen (iteriert über alle Instanzen aller Items)
const stats = computed(() => {
  let expired = 0;
  let soon = 0;
  let ok = 0;

  items.value.forEach(item => {
    if (item.instances && item.instances.length > 0) {
      item.instances.forEach(inst => {
        const status = getExpiryStatus(inst.expiry_date);
        if (status === 'expired') expired++;
        else if (status === 'soon') soon++;
        else ok++;
      });
    } else {
        // Fallback für Items ohne Instanzen (sollte nicht vorkommen, aber sicher ist sicher)
        ok++; 
    }
  });
  return { expired, soon, ok };
});

const openTodosCount = computed(() => todos.value.filter(t => !t.is_completed).length);
const nextTodo = computed(() => todos.value.find(t => !t.is_completed));

// --- 2. Chart Data ---

const doughnutData = computed(() => ({
  labels: ['Abgelaufen', 'Bald fällig', 'OK'],
  datasets: [{
    backgroundColor: ['#f87272', '#fbbd23', '#36d399'], // DaisyUI Error, Warning, Success Colors
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
    // Zähle Items pro Ort
    return items.value.filter(i => i.location_id === loc.id).length;
  });
  
  return {
    labels: locations.value.map(l => l.name),
    datasets: [{
      label: 'Anzahl Produkte',
      backgroundColor: '#66cc8a', // DaisyUI Primary/Accent-ish
      data: data
    }]
  };
});

const barOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } }
};

// --- 3. Quick Actions Modals ---

// A) Add Todo
const todoDialog = ref<HTMLDialogElement | null>(null);
const newTodoTitle = ref('');

const openQuickTodo = () => {
  newTodoTitle.value = '';
  todoDialog.value?.showModal();
};
const saveQuickTodo = async () => {
  if (!newTodoTitle.value) return;
  await addTodo(newTodoTitle.value);
  todoDialog.value?.close();
};

// B) Add Item (Mit Orts-Auswahl!)
const itemDialog = ref<HTMLDialogElement | null>(null);
const newItemLocationId = ref<string>('');
const newItemName = ref('');
const newItemQty = ref(1);
const newItemExpiry = ref('');
const newItemCatId = ref<string | null>(null);

// Kategorien basierend auf gewähltem Ort filtern
const availableCategories = computed(() => {
  if (!newItemLocationId.value) return [];
  return categories.value.filter(c => c.location_id === newItemLocationId.value);
});

const openQuickItem = () => {
  // Defaults
  newItemLocationId.value = locations.value.length > 0 ? locations.value[0].id : '';
  newItemName.value = '';
  newItemQty.value = 1;
  newItemExpiry.value = '';
  newItemCatId.value = null;
  itemDialog.value?.showModal();
};

const saveQuickItem = async () => {
  if (!newItemName.value || !newItemLocationId.value) return;
  
  await addItem(
    newItemName.value, 
    newItemLocationId.value, 
    newItemCatId.value, 
    newItemQty.value, 
    newItemExpiry.value
  );
  itemDialog.value?.close();
};

// Navigation
const goAllItems = () => router.push({ name: 'allItems' });
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
         class="card bg-base-100 shadow-md cursor-pointer hover:shadow-lg transition-all"
         @click="goAllItems"
       >
         <div class="card-body p-4 items-center text-center">
            <div class="text-3xl">⚠️</div>
            <div class="text-2xl font-bold text-error">{{ stats.expired }}</div>
            <div class="text-xs text-gray-500">Abgelaufen</div>
         </div>
       </div>

       <div 
         class="card bg-base-100 shadow-md cursor-pointer hover:shadow-lg transition-all"
         @click="goAllItems"
       >
         <div class="card-body p-4 items-center text-center">
            <div class="text-3xl">⏳</div>
            <div class="text-2xl font-bold text-warning">{{ stats.soon }}</div>
            <div class="text-xs text-gray-500">Bald fällig</div>
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

       <div class="card bg-base-100 shadow-md cursor-pointer" @click="goTodos">
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

    <div class="card bg-base-100 shadow-md">
       <div class="card-body p-4">
          <h3 class="card-title text-sm uppercase text-gray-400">Lagerbestand pro Ort</h3>
          <div class="h-48 relative cursor-pointer" @click="goLocations">
             <Bar :data="barData" :options="barOptions" />
          </div>
       </div>
    </div>

    <div class="fixed bottom-6 right-6 flex flex-col gap-3 z-20">
       <button @click="openQuickTodo" class="btn btn-circle btn-secondary shadow-lg" title="Aufgabe hinzufügen">
          📝
       </button>
       <button @click="openQuickItem" class="btn btn-circle btn-primary btn-lg shadow-lg" title="Produkt hinzufügen">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
       </button>
    </div>

    <dialog ref="todoDialog" class="modal modal-bottom sm:modal-middle">
      <div class="modal-box">
        <h3 class="font-bold text-lg mb-4">Schnelle Aufgabe</h3>
        <input v-model="newTodoTitle" type="text" placeholder="Was ist zu tun?" class="input input-bordered w-full" autofocus @keyup.enter="saveQuickTodo"/>
        <div class="modal-action">
          <form method="dialog"><button class="btn btn-ghost">Abbrechen</button></form>
          <button @click="saveQuickTodo" class="btn btn-primary">Speichern</button>
        </div>
      </div>
    </dialog>

    <dialog ref="itemDialog" class="modal modal-bottom sm:modal-middle">
      <div class="modal-box">
        <h3 class="font-bold text-lg mb-4">Produkt hinzufügen</h3>
        
        <div class="form-control mb-4">
           <label class="label"><span class="label-text font-bold">Wo soll es hin?</span></label>
           <select v-model="newItemLocationId" class="select select-bordered w-full">
              <option disabled value="">Ort wählen</option>
              <option v-for="loc in locations" :key="loc.id" :value="loc.id">{{ loc.icon }} {{ loc.name }}</option>
           </select>
        </div>

        <div class="form-control mb-2">
           <label class="label"><span class="label-text font-bold">Name</span></label>
           <input v-model="newItemName" type="text" placeholder="z.B. Butter" class="input input-bordered w-full" />
        </div>

        <div class="grid grid-cols-2 gap-4 mb-4">
           <div class="form-control">
             <label class="label"><span class="label-text">Anzahl</span></label>
             <input v-model="newItemQty" type="number" min="1" class="input input-bordered" />
           </div>
           <div class="form-control">
             <label class="label"><span class="label-text">Ablaufdatum</span></label>
             <input v-model="newItemExpiry" type="date" class="input input-bordered" />
           </div>
        </div>

        <div class="form-control mb-6">
           <label class="label"><span class="label-text">Kategorie (Optional)</span></label>
           <select v-model="newItemCatId" class="select select-bordered w-full" :disabled="!newItemLocationId">
              <option :value="null">Keine Kategorie</option>
              <option v-for="cat in availableCategories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
           </select>
        </div>

        <div class="modal-action">
          <form method="dialog"><button class="btn btn-ghost">Abbrechen</button></form>
          <button @click="saveQuickItem" class="btn btn-primary" :disabled="!newItemName || !newItemLocationId">Speichern</button>
        </div>
      </div>
    </dialog>

  </div>
</template>