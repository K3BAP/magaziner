<script setup lang="ts">
import { ref, computed, watchEffect } from 'vue';
import { useAuth } from './composables/useAuth';
import { useInventory, type Location } from './composables/useInventory';
import ItemRow from './components/ItemRow.vue'; // Stelle sicher, dass diese Datei existiert!

// Auth & Data Logic
const { user, signUp, signIn, signOut } = useAuth();
const { 
  locations, 
  categories,
  fetchInventory, 
  getItemsByLocation, 
  searchItems, 
  loading: dataLoading,
  addLocation,
  addItem,
  addCategory
} = useInventory();

// Auth Form State
const email = ref('');
const password = ref('');
const isLoginMode = ref(true);
const authLoading = ref(false);

// App State
const currentView = ref<'dashboard' | 'location' | 'search'>('dashboard');
const selectedLocation = ref<Location | null>(null);
const searchQuery = ref('');

// Computed Data
const currentLocationData = computed(() => {
  if (!selectedLocation.value) return null;
  return getItemsByLocation(selectedLocation.value.id).value;
});

const searchResults = computed(() => searchItems(searchQuery.value));

// --- WICHTIG: Daten laden, sobald User da ist ---
watchEffect(() => {
  if (user.value) {
    fetchInventory(); // Lade Daten aus Supabase
  }
});

// Actions
const handleAuth = async () => {
  authLoading.value = true;
  try {
    if (isLoginMode.value) await signIn(email.value, password.value);
    else await signUp(email.value, password.value);
  } catch (e: any) {
    alert(e.message);
  } finally {
    authLoading.value = false;
  }
};

const openLocation = (loc: Location) => {
  selectedLocation.value = loc;
  currentView.value = 'location';
};

const goHome = () => {
  currentView.value = 'dashboard';
  selectedLocation.value = null;
  searchQuery.value = '';
};

// --- NEU: Modal Logik ---
const newLocName = ref('');
const newLocIcon = ref('📦'); // Standard Icon
const addLocationDialog = ref<HTMLDialogElement | null>(null); // Referenz zum HTML Element

// Eine Auswahl passender Icons für den Haushalt
const availableIcons = ['❄️', '🥫', '📦', '🧹', '🛁', '💊', '🍷', '🚪', '🍎', '🥩', '🧊', '🧺'];

const openAddLocationModal = () => {
  newLocName.value = '';
  newLocIcon.value = '📦';
  addLocationDialog.value?.showModal(); // DaisyUI/Native Dialog öffnen
};

const saveNewLocation = async () => {
  if (!newLocName.value) return;
  
  await addLocation(newLocName.value, newLocIcon.value);
  
  addLocationDialog.value?.close(); // Dialog schließen
};

// --- NEU: Item Modal State ---
const addItemDialog = ref<HTMLDialogElement | null>(null);
const newItemName = ref('');
const selectedCategoryId = ref<string | null>(null); // ID der gewählten Kategorie
const newCategoryName = ref(''); // Text für neue Kategorie

// State für das Modal erweitern
const newItemQuantity = ref(1);       // Standard: 1
const newItemExpiry = ref('');

// Computed: Verfügbare Kategorien NUR für den aktuellen Ort
const currentLocationCategories = computed(() => {
  if (!selectedLocation.value) return [];
  return categories.value.filter(c => c.location_id === selectedLocation.value!.id);
});

const openAddItemModal = () => {
  newItemName.value = '';
  selectedCategoryId.value = null;
  newCategoryName.value = '';
  
  // Neue Felder resetten
  newItemQuantity.value = 1;
  newItemExpiry.value = '';
  
  addItemDialog.value?.showModal();
};

const saveNewItem = async () => {
  if (!newItemName.value || !selectedLocation.value) return;

  try {
    let finalCategoryId = selectedCategoryId.value;

    if (newCategoryName.value.trim()) {
      const newCat = await addCategory(newCategoryName.value, selectedLocation.value.id);
      if (newCat) finalCategoryId = newCat.id;
    }

    // HIER IST DAS UPDATE: quantity und expiry übergeben
    await addItem(
      newItemName.value, 
      selectedLocation.value.id, 
      finalCategoryId,
      newItemQuantity.value,
      newItemExpiry.value
    );

    addItemDialog.value?.close();
  } catch (e) {
    alert('Fehler beim Speichern');
  }
};

// UX-Helper: Wenn man im Textfeld tippt, Auswahl des Chips aufheben
const onNewCategoryInput = () => {
  if (newCategoryName.value) selectedCategoryId.value = null;
};
// UX-Helper: Wenn man Chip klickt, Textfeld leeren
const onCategorySelect = (id: string) => {
  selectedCategoryId.value = id;
  newCategoryName.value = '';
};
</script>

<template>
  <div v-if="!user" class="min-h-screen flex items-center justify-center bg-base-200 p-4">
    <div class="card w-full max-w-sm shadow-2xl bg-base-100">
      <div class="card-body">
        <h2 class="card-title justify-center mb-4">{{ isLoginMode ? 'Einloggen' : 'Registrieren' }}</h2>
        <form @submit.prevent="handleAuth" class="space-y-4">
          <input v-model="email" type="email" placeholder="Email" class="input input-bordered w-full" required />
          <input v-model="password" type="password" placeholder="Passwort" class="input input-bordered w-full" required />
          <button type="submit" class="btn btn-primary w-full" :disabled="authLoading">
            {{ isLoginMode ? 'Starten' : 'Konto erstellen' }}
          </button>
        </form>
        <div class="text-center mt-4 text-sm cursor-pointer link link-primary" @click="isLoginMode = !isLoginMode">
          {{ isLoginMode ? 'Noch kein Konto?' : 'Zum Login' }}
        </div>
      </div>
    </div>
  </div>

  <div v-else class="min-h-screen bg-base-200"> <div class="navbar bg-base-100 shadow-sm sticky top-0 z-10">
      <div class="flex-1">
        <button 
          v-if="currentView === 'location'" 
          @click="goHome" 
          class="btn btn-ghost btn-circle mr-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
        </button>
        
        <span class="font-bold text-lg truncate">
          {{ currentView === 'dashboard' ? 'Mein Vorrat' : (selectedLocation?.name || 'Suche') }}
        </span>
      </div>
      
      <div class="flex-none gap-2">
        <button 
          v-if="currentView !== 'search'" 
          class="btn btn-ghost btn-circle" 
          @click="currentView = 'search'"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        </button>

        <button class="btn btn-ghost btn-circle" @click="signOut">
           <span class="text-xl">🚪</span>
        </button>
      </div>
    </div>

    <div class="p-4 container mx-auto max-w-md">
      
      <div v-if="dataLoading" class="flex justify-center mt-10">
        <span class="loading loading-spinner loading-lg"></span>
      </div>

      <div v-else-if="currentView === 'dashboard'" class="grid grid-cols-2 gap-4">
        <div v-for="loc in locations" :key="loc.id" @click="openLocation(loc)"
          class="card bg-base-100 shadow-md hover:shadow-lg cursor-pointer active:scale-95 transition-transform">
          <div class="card-body items-center text-center p-6">
            <div class="text-4xl mb-2">{{ loc.icon || '📦' }}</div>
            <h2 class="card-title text-base">{{ loc.name }}</h2>
          </div>
        </div>
        <button 
          @click="openAddLocationModal"
          class="card border-2 border-dashed border-base-300 bg-base-100/50 hover:bg-base-100 hover:border-primary transition-colors flex items-center justify-center p-6 cursor-pointer h-full min-h-[140px]"
        >
          <div class="text-center text-base-content/60">
            <div class="text-3xl mb-1">+</div>
            <div class="font-medium">Ort hinzufügen</div>
          </div>
        </button>
      </div>

      <div v-else-if="currentView === 'location' && currentLocationData">
        <div v-if="currentLocationData.uncategorized.length > 0" class="card bg-base-100 shadow-sm mb-4 overflow-hidden">
          <ItemRow v-for="item in currentLocationData.uncategorized" :key="item.id" :item="item" />
        </div>
        <div v-for="group in currentLocationData.grouped" :key="group.id" class="mb-4">
          <h3 class="font-bold text-sm uppercase text-gray-500 ml-2 mb-2">{{ group.name }}</h3>
          <div class="card bg-base-100 shadow-sm overflow-hidden">
            <ItemRow v-for="item in group.items" :key="item.id" :item="item" />
          </div>
        </div>
        <div v-if="currentLocationData.uncategorized.length === 0 && currentLocationData.grouped.length === 0" class="text-center opacity-50 mt-10">
          Dieser Ort ist leer.
        </div>
        <div class="fixed bottom-6 right-6 z-20">
          <button @click="openAddItemModal" class="btn btn-circle btn-primary btn-lg shadow-xl">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      </div>

    </div>

     <div v-if="currentView === 'search'" class="fixed inset-0 bg-base-200 z-20 p-4 pt-20">
        <div class="flex gap-2 mb-4">
           <button @click="goHome" class="btn btn-square bg-base-100 shadow-sm">✕</button>
           <input v-model="searchQuery" class="input input-bordered w-full shadow-sm" placeholder="Produkt suchen..." autofocus />
        </div>
        <div class="card bg-base-100 shadow-sm overflow-y-auto max-h-[80vh]">
           <ItemRow v-for="item in searchResults" :key="item.id" :item="item" :show-location="true" />
           <div v-if="searchQuery && searchResults.length === 0" class="p-4 text-center opacity-50">
             Nichts gefunden.
           </div>
        </div>
     </div>

    <dialog ref="addLocationDialog" class="modal modal-bottom sm:modal-middle">
        <div class="modal-box">
            <h3 class="font-bold text-lg mb-4">Neuen Ort erstellen</h3>
            <div class="form-control w-full mb-4">
            <label class="label"><span class="label-text">Name des Ortes</span></label>
            <input v-model="newLocName" type="text" placeholder="z.B. Vorratskammer" class="input input-bordered w-full" @keyup.enter="saveNewLocation"/>
            </div>
            <div class="form-control w-full mb-6">
            <label class="label"><span class="label-text">Wähle ein Icon</span></label>
            <div class="grid grid-cols-6 gap-2">
                <button v-for="icon in availableIcons" :key="icon" @click="newLocIcon = icon" class="btn btn-square text-xl" :class="newLocIcon === icon ? 'btn-primary' : 'btn-ghost bg-base-200'" type="button">{{ icon }}</button>
            </div>
            </div>
            <div class="modal-action">
            <form method="dialog"><button class="btn btn-ghost mr-2">Abbrechen</button></form>
            <button @click="saveNewLocation" class="btn btn-primary">Erstellen</button>
            </div>
        </div>
    </dialog>

    <dialog ref="addItemDialog" class="modal modal-bottom sm:modal-middle">
        <div class="modal-box">
            <h3 class="font-bold text-lg mb-4">Neues Produkt in {{ selectedLocation?.name }}</h3>
            <div class="form-control w-full mb-2">
                <label class="label"><span class="label-text font-bold">Produktname</span></label>
                <input v-model="newItemName" type="text" placeholder="z.B. Fischstäbchen" class="input input-bordered w-full" autofocus @keyup.enter="saveNewItem"/>
            </div>
            <div class="grid grid-cols-2 gap-4 mb-4">
            <div class="form-control">
                <label class="label"><span class="label-text font-bold">Anzahl</span></label>
                <div class="join">
                <button @click="newItemQuantity > 1 ? newItemQuantity-- : null" class="btn btn-sm join-item">-</button>
                <input v-model="newItemQuantity" type="number" min="1" class="input input-bordered input-sm join-item w-full text-center" />
                <button @click="newItemQuantity++" class="btn btn-sm join-item">+</button>
                </div>
            </div>
            <div class="form-control">
                <label class="label"><span class="label-text font-bold">Ablaufdatum</span></label>
                <input v-model="newItemExpiry" type="date" class="input input-bordered input-sm w-full" />
            </div>
            </div>
            <div class="form-control w-full mb-2">
            <label class="label"><span class="label-text font-bold">Kategorie (Optional)</span></label>
            <div v-if="currentLocationCategories.length > 0" class="flex flex-wrap gap-2 mb-3">
                <button v-for="cat in currentLocationCategories" :key="cat.id" @click="onCategorySelect(cat.id)" class="btn btn-sm normal-case" :class="selectedCategoryId === cat.id ? 'btn-primary' : 'btn-outline border-base-300'">{{ cat.name }}</button>
            </div>
            <div class="collapse collapse-arrow border border-base-200 bg-base-100 rounded-box">
                <input type="checkbox" :checked="!!newCategoryName" /> 
                <div class="collapse-title text-sm font-medium text-gray-500">Oder neue Kategorie erstellen...</div>
                <div class="collapse-content">
                <input v-model="newCategoryName" @input="onNewCategoryInput" type="text" placeholder="Neue Kategorie benennen" class="input input-bordered input-sm w-full mt-2" />
                </div>
            </div>
            </div>
            <div class="modal-action">
            <form method="dialog"><button class="btn btn-ghost mr-2">Abbrechen</button></form>
            <button @click="saveNewItem" class="btn btn-primary" :disabled="!newItemName">Speichern</button>
            </div>
        </div>
    </dialog>

  </div>
</template>