<script setup lang="ts">
import { ref, computed, watchEffect } from 'vue';
import { useAuth } from './composables/useAuth';
import { useInventory, type Location } from './composables/useInventory';
import ItemRow from './components/ItemRow.vue'; // Stelle sicher, dass diese Datei existiert!

// Auth & Data Logic
const { user, signUp, signIn, signOut } = useAuth();
const { 
  locations, 
  fetchInventory, 
  getItemsByLocation, 
  searchItems, 
  loading: dataLoading 
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

  <div v-else class="min-h-screen bg-base-200 pb-20">
    
    <div class="navbar bg-base-100 shadow-sm sticky top-0 z-10">
      <div class="flex-1">
        <button v-if="currentView !== 'dashboard'" @click="goHome" class="btn btn-ghost btn-circle mr-2">
           <span class="text-xl">←</span>
        </button>
        <span class="font-bold text-lg truncate">
          {{ currentView === 'dashboard' ? 'Mein Vorrat' : (selectedLocation?.name || 'Suche') }}
        </span>
      </div>
      <div class="flex-none">
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
        <div class="card border-2 border-dashed border-base-300 flex items-center justify-center p-6 text-base-content/50">
          + Bald verfügbar
        </div>
      </div>

      <div v-else-if="currentView === 'location' && currentLocationData">
        <div v-if="currentLocationData.uncategorized.length > 0" class="card bg-base-100 shadow-sm mb-4">
          <ItemRow v-for="item in currentLocationData.uncategorized" :key="item.id" :item="item" />
        </div>
        <div v-for="group in currentLocationData.grouped" :key="group.id" class="mb-4">
          <h3 class="font-bold text-sm uppercase text-gray-500 ml-2 mb-2">{{ group.name }}</h3>
          <div class="card bg-base-100 shadow-sm">
            <ItemRow v-for="item in group.items" :key="item.id" :item="item" />
          </div>
        </div>
        <div v-if="currentLocationData.uncategorized.length === 0 && currentLocationData.grouped.length === 0" class="text-center opacity-50 mt-10">
          Dieser Ort ist leer.
        </div>
      </div>

    </div>

    <div class="btm-nav btm-nav-sm border-t border-base-300 lg:hidden">
      <button :class="{active: currentView === 'dashboard'}" @click="goHome"><span class="text-xl">🏠</span></button>
      <button :class="{active: currentView === 'search'}" @click="currentView = 'search'"><span class="text-xl">🔍</span></button>
    </div>

     <div v-if="currentView === 'search'" class="fixed inset-0 bg-base-200 z-20 p-4 pt-20">
        <div class="flex gap-2 mb-4">
           <button @click="goHome" class="btn btn-square">✕</button>
           <input v-model="searchQuery" class="input input-bordered w-full" placeholder="Suchen..." autofocus />
        </div>
        <div class="card bg-base-100 shadow-sm overflow-y-auto max-h-[80vh]">
           <ItemRow v-for="item in searchResults" :key="item.id" :item="item" :show-location="true" />
        </div>
     </div>

  </div>
</template>