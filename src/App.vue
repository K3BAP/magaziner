<script setup lang="ts">
import { ref, computed, watchEffect, nextTick } from 'vue';
import { useAuth } from './composables/useAuth';
import { useInventory, type Location } from './composables/useInventory';
import ItemRow from './components/ItemRow.vue';
import { useTodos } from './composables/useTodos';
import TodoRow from './components/TodoRow.vue';

// --- Auth & Data Logic ---
const { user, signUp, signIn, signOut } = useAuth();
const { 
  locations, 
  items, // Wir brauchen direkten Zugriff auf alle Items
  categories,
  fetchInventory, 
  getItemsByLocation, 
  loading: dataLoading,
  addLocation,
  addCategory,
  deleteCategory,
  addItem,
  updateLocation,
  deleteLocation
} = useInventory();

// --- Auth Form State ---
const email = ref('');
const password = ref('');
const isLoginMode = ref(true);
const authLoading = ref(false);

const { 
  todos, 
  fetchTodos, 
  addTodo, 
  loading: todosLoading 
} = useTodos();

// State für neues Todo
const newTodoTitle = ref('');


// --- Navigation State ---
// 'dashboard' = Kacheln, 'allItems' = Liste aller Produkte, 'location' = Einzelansicht
const currentView = ref<'dashboard' | 'allItems' | 'location' | 'todos'>('dashboard');
const selectedLocation = ref<Location | null>(null);
const drawerOpen = ref(false); // Steuert die Sidebar

// --- "Alle Produkte" View State ---
const globalSearchQuery = ref('');
const sortBy = ref<'name' | 'date'>('name');
const searchInputRef = ref<HTMLInputElement | null>(null);

// --- Computed Data ---

// 1. Daten für Einzelansicht (Ort)
const currentLocationData = computed(() => {
  if (!selectedLocation.value) return null;
  return getItemsByLocation(selectedLocation.value.id).value;
});

// 2. Daten für "Alle Produkte" (Sortiert & Gefiltert)
const allItemsFiltered = computed(() => {
  // A) Filtern
  let result = items.value.filter(i => 
    i.name.toLowerCase().includes(globalSearchQuery.value.toLowerCase())
  );

  // B) Sortieren
  return result.sort((a, b) => {
    if (sortBy.value === 'name') {
      return a.name.localeCompare(b.name);
    } else {
      // Datum: Wir nehmen jeweils das FRÜHESTE Datum aller Instanzen
      // Wenn ein Item gar keine Instanzen hat (sollte nicht passieren), kommts nach hinten
      const getEarliest = (item: any) => {
         if (!item.instances || item.instances.length === 0) return 9999999999999;
         // Instanzen sind durch fetchInventory schon sortiert -> das erste ist das früheste
         const firstDate = item.instances[0].expiry_date;
         return firstDate ? new Date(firstDate).getTime() : 9999999999999;
      };

      return getEarliest(a) - getEarliest(b);
    }
  });
});

// --- Lifecycle & Watchers ---
watchEffect(() => {
  if (user.value) {
    fetchInventory();
    fetchTodos(); // NEU
  }
});

// Helper für neues Todo
const handleAddTodo = async () => {
  if (!newTodoTitle.value.trim()) return;
  await addTodo(newTodoTitle.value);
  newTodoTitle.value = ''; // Input leeren
};

// --- Actions ---

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

const handleSignOut = async () => {
  await signOut();
  drawerOpen.value = false;
};

// Navigation Helpers
const openLocation = (loc: Location) => {
  selectedLocation.value = loc;
  currentView.value = 'location';
};

const navigateTo = (view: 'dashboard' | 'allItems' | 'todos') => {
  currentView.value = view;
  selectedLocation.value = null;
  drawerOpen.value = false; // Sidebar schließen bei Klick
  
  // Reset Search bei Dashboard, aber behalten bei AllItems
  if (view === 'dashboard') {
    globalSearchQuery.value = '';
  }
};

const goToSearch = async () => {
  navigateTo('allItems');
  // Fokus auf das Suchfeld setzen (nach DOM Update)
  await nextTick();
  searchInputRef.value?.focus();
};

// --- Modal Logic (Hinzufügen) ---
// (Hier übernehmen wir die Refs und Funktionen vom vorherigen Schritt)
const addLocationDialog = ref<HTMLDialogElement | null>(null);
const addItemDialog = ref<HTMLDialogElement | null>(null);
const newLocName = ref('');
const newLocIcon = ref('📦');
const newItemName = ref('');
const newItemQuantity = ref(1);
const newItemExpiry = ref('');
const selectedCategoryId = ref<string | null>(null);
const newCategoryName = ref('');
const availableIcons = ['❄️', '🥫', '📦', '🧹', '🛁', '💊', '🍷', '🚪', '🍎', '🧊', '🧺', '🛏', '🥖', '🏠', '🏡', '🚗'];

// Computed für Modal
const currentLocationCategories = computed(() => {
  if (!selectedLocation.value) return [];
  return categories.value.filter(c => c.location_id === selectedLocation.value!.id);
});

const openAddItemModal = () => {
  newItemName.value = '';
  newItemQuantity.value = 1;
  newItemExpiry.value = '';
  selectedCategoryId.value = null;
  newCategoryName.value = '';
  addItemDialog.value?.showModal();
};
const onCategorySelect = (id: string) => { selectedCategoryId.value = id; newCategoryName.value = ''; };
const onNewCategoryInput = () => { if (newCategoryName.value) selectedCategoryId.value = null; };

const saveNewItem = async () => {
  if (!newItemName.value || !selectedLocation.value) return;
  try {
    let finalCategoryId = selectedCategoryId.value;
    if (newCategoryName.value.trim()) {
      const newCat = await addCategory(newCategoryName.value, selectedLocation.value.id);
      if (newCat) finalCategoryId = newCat.id;
    }
    await addItem(newItemName.value, selectedLocation.value.id, finalCategoryId, newItemQuantity.value, newItemExpiry.value);
    addItemDialog.value?.close();
  } catch (e) { alert('Fehler beim Speichern'); }
};

const handleDeleteCategory = async (catId: string) => {
  const success = await deleteCategory(catId);
  if (success) {
    // Falls die gelöschte Kategorie gerade ausgewählt war -> Auswahl aufheben
    if (selectedCategoryId.value === catId) {
      selectedCategoryId.value = null;
    }
  }
};

// --- STATE FÜR ORT BEARBEITEN ---
const editingLocationId = ref<string | null>(null); // Wenn gesetzt, sind wir im Edit-Modus

// Öffnen für "NEU ERSTELLEN"
const openAddLocationModal = () => {
  editingLocationId.value = null; // Reset: Kein Edit-Modus
  newLocName.value = '';
  newLocIcon.value = '📦';
  addLocationDialog.value?.showModal();
};

// Öffnen für "BEARBEITEN"
const openEditLocationModal = (loc: Location, event: Event) => {
  event.stopPropagation(); // WICHTIG: Verhindert, dass sich der Ort öffnet
  editingLocationId.value = loc.id;
  newLocName.value = loc.name;
  newLocIcon.value = loc.icon || '📦';
  addLocationDialog.value?.showModal();
};

// Speichern (Unterscheidet zwischen Create und Update)
const saveNewLocation = async () => {
  if (!newLocName.value) return;

  if (editingLocationId.value) {
    // Update Fall
    await updateLocation(editingLocationId.value, newLocName.value, newLocIcon.value);
  } else {
    // Create Fall
    await addLocation(newLocName.value, newLocIcon.value);
  }
  
  addLocationDialog.value?.close();
};

// LÖSCHEN Logik
const initiateDeleteLocation = async () => {
  if (!editingLocationId.value) return;

  // Prüfen, ob Items drin sind
  const itemsInLocation = items.value.filter(i => i.location_id === editingLocationId.value);
  const count = itemsInLocation.length;

  if (count > 0) {
    if (!confirm(`ACHTUNG: In diesem Ort befinden sich noch ${count} Produkte.\n\nWenn du den Ort löschst, werden diese Produkte endgültig entfernt.\n\nWirklich löschen?`)) {
      return;
    }
  } else {
    if (!confirm('Ort wirklich löschen?')) return;
  }

  // Löschen durchführen
  await deleteLocation(editingLocationId.value);
  addLocationDialog.value?.close();
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

  <div v-else class="drawer">
    <input id="main-drawer" type="checkbox" class="drawer-toggle" v-model="drawerOpen" />
    
    <div class="drawer-content flex flex-col min-h-screen bg-base-200">
      
      <div class="navbar bg-base-100 shadow-sm sticky top-0 z-10">
        <div class="flex-none">
          <button v-if="currentView === 'location'" @click="navigateTo('dashboard')" class="btn btn-square btn-ghost">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
          </button>
          
          <label v-else for="main-drawer" class="btn btn-square btn-ghost drawer-button">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="inline-block w-6 h-6 stroke-current"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
          </label>
        </div>
        
        <div class="flex-1">
          <span class="btn btn-ghost normal-case text-xl truncate">
            {{ 
              currentView === 'dashboard' ? 'Mein Vorrat' : 
              (currentView === 'allItems' ? 'Alle Produkte' : 
              (currentView === 'todos' ? 'Aufgaben' : selectedLocation?.name)) 
            }}
          </span>
        </div>
        
        <div class="flex-none">
          <button 
            v-if="currentView !== 'dashboard'" 
            class="btn btn-ghost btn-circle" 
            @click="navigateTo('dashboard')"
            title="Zurück zum Dashboard"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </button>
          
          <button 
            v-else
            class="btn btn-ghost btn-circle" 
            @click="goToSearch"
          >
             <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </button>
        </div>
      </div>

      <div class="p-4 container mx-auto max-w-md flex-grow">
        
        <div v-if="dataLoading" class="flex justify-center mt-10">
          <span class="loading loading-spinner loading-lg"></span>
        </div>

        <div v-else-if="currentView === 'dashboard'" class="grid grid-cols-2 gap-4">
          <div v-for="loc in locations" :key="loc.id" @click="openLocation(loc)"
            class="card bg-base-100 shadow-md hover:shadow-lg cursor-pointer active:scale-95 transition-transform relative group">
            
            <div class="card-body items-center text-center p-6">
              <div class="text-4xl mb-2">{{ loc.icon || '📦' }}</div>
              <h2 class="card-title text-base">{{ loc.name }}</h2>
            </div>

            <button 
              @click="(e) => openEditLocationModal(loc, e)"
              class="btn btn-xs btn-circle btn-ghost absolute top-2 right-2 opacity-50 hover:opacity-100 bg-base-200/50 hover:bg-base-300 border-none"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
          <button @click="openAddLocationModal" class="card border-2 border-dashed border-base-300 bg-base-100/50 hover:bg-base-100 flex items-center justify-center p-6 cursor-pointer h-full min-h-[140px]">
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
           <div v-if="currentLocationData.uncategorized.length === 0 && currentLocationData.grouped.length === 0" class="text-center opacity-50 mt-10">Dieser Ort ist leer.</div>
           
           <div class="fixed bottom-6 right-6 z-20">
             <button @click="openAddItemModal" class="btn btn-circle btn-primary btn-lg shadow-xl">
               <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
             </button>
           </div>
        </div>

        <div v-else-if="currentView === 'allItems'">
          
          <div class="flex flex-col gap-3 mb-6">
            <input 
              ref="searchInputRef"
              v-model="globalSearchQuery" 
              type="text" 
              placeholder="Alle Produkte durchsuchen..." 
              class="input input-bordered w-full shadow-sm"
            />
            
            <div class="flex gap-2">
              <button 
                @click="sortBy = 'name'" 
                class="btn btn-sm flex-1"
                :class="sortBy === 'name' ? 'btn-primary' : 'btn-outline border-base-300'"
              >
                A-Z
              </button>
              <button 
                @click="sortBy = 'date'" 
                class="btn btn-sm flex-1"
                :class="sortBy === 'date' ? 'btn-primary' : 'btn-outline border-base-300'"
              >
                📅 Ablaufdatum
              </button>
            </div>
          </div>

          <div class="card bg-base-100 shadow-sm overflow-hidden">
            <ItemRow 
              v-for="item in allItemsFiltered" 
              :key="item.id" 
              :item="item" 
              :show-location="true" 
            />
            <div v-if="allItemsFiltered.length === 0" class="p-8 text-center opacity-50">
              {{ globalSearchQuery ? 'Keine Treffer.' : 'Keine Produkte vorhanden.' }}
            </div>
          </div>

        </div>

        <div v-else-if="currentView === 'todos'">
          
          <div class="join w-full mb-6 shadow-sm">
            <input 
              v-model="newTodoTitle" 
              @keyup.enter="handleAddTodo"
              class="input input-bordered join-item w-full" 
              placeholder="Neue Aufgabe (z.B. Müll rausbringen)..." 
            />
            <button @click="handleAddTodo" class="btn btn-primary join-item">Hinzufügen</button>
          </div>

          <div v-if="todosLoading" class="flex justify-center py-4">
             <span class="loading loading-spinner"></span>
          </div>

          <div v-else class="card bg-base-100 shadow-sm overflow-hidden">
             <div v-if="todos.length > 0">
                <TodoRow v-for="todo in todos" :key="todo.id" :todo="todo" />
             </div>
             
             <div v-else class="p-10 text-center opacity-50 flex flex-col items-center gap-2">
                <span class="text-4xl">🎉</span>
                <span>Alles erledigt!</span>
             </div>
          </div>
        </div>

      </div>
    </div> 
    <div class="drawer-side z-20">
      <label for="main-drawer" class="drawer-overlay"></label>
      <ul class="menu p-4 w-80 min-h-full bg-base-100 text-base-content flex flex-col">
        <li class="mb-4 font-bold text-xl px-4 py-2 bg-base-200 rounded-lg">
          Mein Vorrat
        </li>
        
        <li>
          <a @click="navigateTo('dashboard')" :class="{active: currentView === 'dashboard' || currentView === 'location'}">
            📦 Orte / Dashboard
          </a>
        </li>
        <li>
          <a @click="navigateTo('allItems')" :class="{active: currentView === 'allItems'}">
            🔍 Alle Produkte
          </a>
        </li>
        <li>
          <a @click="navigateTo('todos')" :class="{active: currentView === 'todos'}">
            ✅ To-Do Liste
          </a>
        </li>

        <div class="divider"></div>

        <li class="mt-auto">
          <a @click="handleSignOut" class="text-error">
            🚪 Abmelden
          </a>
        </li>
        <li class="text-xs text-center mt-2 opacity-50">
          User: {{ user?.email }}
        </li>
      </ul>
    </div>

  </div> 

  <dialog ref="addLocationDialog" class="modal modal-bottom sm:modal-middle">
      <div class="modal-box">
          <h3 class="font-bold text-lg mb-4">
            {{ editingLocationId ? 'Ort bearbeiten' : 'Neuen Ort erstellen' }}
          </h3>
          
          <div class="form-control w-full mb-4">
            <input v-model="newLocName" type="text" placeholder="Name" class="input input-bordered w-full" @keyup.enter="saveNewLocation"/>
          </div>
          <div class="grid grid-cols-4 gap-2 mb-6 place-items-center">
            <button v-for="icon in availableIcons" :key="icon" @click="newLocIcon = icon" class="btn btn-square text-xl" :class="newLocIcon === icon ? 'btn-primary' : 'btn-ghost bg-base-200'" type="button">{{ icon }}</button>
          </div>
          
          <div class="modal-action justify-between">
            <div>
              <button 
                v-if="editingLocationId" 
                @click="initiateDeleteLocation" 
                class="btn btn-ghost text-error hover:bg-error/10"
              >
                Löschen
              </button>
            </div>

            <div class="flex gap-2">
              <form method="dialog"><button class="btn btn-ghost">Abbrechen</button></form>
              <button @click="saveNewLocation" class="btn btn-primary">
                {{ editingLocationId ? 'Speichern' : 'Erstellen' }}
              </button>
            </div>
          </div>
      </div>
  </dialog>

  <dialog ref="addItemDialog" class="modal modal-bottom sm:modal-middle">
      <div class="modal-box">
          <h3 class="font-bold text-lg mb-4">Neues Produkt</h3>
          <div class="form-control w-full mb-2">
              <label class="label"><span class="label-text font-bold">Name</span></label>
              <input v-model="newItemName" type="text" placeholder="z.B. Milch" class="input input-bordered w-full" autofocus @keyup.enter="saveNewItem"/>
          </div>
          <div class="grid grid-cols-2 gap-4 mb-4">
             <div class="form-control">
               <label class="label"><span class="label-text font-bold">Anzahl</span></label>
               <div class="join"><button @click="newItemQuantity > 1 ? newItemQuantity-- : null" class="btn btn-sm join-item">-</button><input v-model="newItemQuantity" type="number" class="input input-bordered input-sm join-item w-full text-center" /><button @click="newItemQuantity++" class="btn btn-sm join-item">+</button></div>
             </div>
             <div class="form-control"><label class="label"><span class="label-text font-bold">Ablauf</span></label><input v-model="newItemExpiry" type="date" class="input input-bordered input-sm w-full" /></div>
          </div>
          <div class="form-control w-full mb-2">
            <label class="label"><span class="label-text font-bold">Kategorie</span></label>
            <div v-if="currentLocationCategories.length > 0" class="flex flex-wrap gap-2 mb-3">
               
               <div v-for="cat in currentLocationCategories" :key="cat.id" class="join shadow-sm">
                  
                  <button 
                    @click="onCategorySelect(cat.id)" 
                    class="btn btn-sm join-item normal-case border-r-0"
                    :class="selectedCategoryId === cat.id ? 'btn-primary' : 'btn-outline border-base-300'"
                    type="button"
                  >
                    {{ cat.name }}
                  </button>

                  <button 
                    @click.stop="handleDeleteCategory(cat.id)"
                    class="btn btn-sm join-item px-2 border-l-0 hover:bg-error hover:text-white hover:border-error transition-colors"
                    :class="selectedCategoryId === cat.id ? 'btn-primary' : 'btn-outline border-base-300'"
                    type="button"
                    title="Kategorie löschen"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>

               </div>

            </div>
            <div class="collapse collapse-arrow border border-base-200 bg-base-100 rounded-box">
               <input type="checkbox" :checked="!!newCategoryName" /> 
               <div class="collapse-title text-sm text-gray-500">Oder neu...</div>
               <div class="collapse-content"><input v-model="newCategoryName" @input="onNewCategoryInput" type="text" class="input input-bordered input-sm w-full mt-2" /></div>
            </div>
          </div>
          <div class="modal-action"><form method="dialog"><button class="btn btn-ghost mr-2">Abbrechen</button></form><button @click="saveNewItem" class="btn btn-primary" :disabled="!newItemName">Speichern</button></div>
      </div>
  </dialog>
</template>