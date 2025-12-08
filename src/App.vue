<script setup lang="ts">
import { ref, computed } from 'vue';
import ItemRow from './components/ItemRow.vue';
import { useInventory, type Location } from './composables/useInventory';

// State
const { locations, getItemsByLocation, searchItems } = useInventory();
const currentView = ref<'dashboard' | 'location' | 'search'>('dashboard');
const selectedLocation = ref<Location | null>(null);
const searchQuery = ref('');

// Computed Data für Views
const currentLocationData = computed(() => {
  if (!selectedLocation.value) return null;
  return getItemsByLocation(selectedLocation.value.id).value;
});

const searchResults = computed(() => searchItems(searchQuery.value));

// Navigation Actions
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
  <div class="min-h-screen bg-base-200 pb-20"> 
    <div class="navbar bg-base-100 shadow-sm sticky top-0 z-10">
      <div class="flex-1">
        <button 
          v-if="currentView !== 'dashboard'" 
          @click="goHome" 
          class="btn btn-ghost btn-circle mr-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        
        <a class="btn btn-ghost text-xl normal-case">
          <span v-if="currentView === 'dashboard'">Mein Vorrat</span>
          <span v-else-if="currentView === 'search'">Suche</span>
          <span v-else>{{ selectedLocation?.name }}</span>
        </a>
      </div>
      
      <div class="flex-none" v-if="currentView !== 'search'">
        <button class="btn btn-square btn-ghost" @click="currentView = 'search'">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>
      </div>
    </div>

    <div class="p-4 container mx-auto max-w-md">

      <div v-if="currentView === 'dashboard'" class="grid grid-cols-2 gap-4">
        <div 
          v-for="loc in locations" 
          :key="loc.id"
          @click="openLocation(loc)"
          class="card bg-base-100 shadow-md hover:shadow-lg transition-all cursor-pointer active:scale-95"
        >
          <div class="card-body items-center text-center p-6">
            <div class="text-4xl mb-2">{{ loc.icon }}</div>
            <h2 class="card-title text-base">{{ loc.name }}</h2>
          </div>
        </div>
        
        <div class="card border-2 border-dashed border-base-300 flex items-center justify-center p-6 text-base-content/50">
          + Ort hinzufügen
        </div>
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

        <div v-if="currentLocationData.uncategorized.length === 0 && currentLocationData.grouped.length === 0" class="text-center py-10 opacity-50">
          Hier ist noch nichts drin.
        </div>
      </div>

      <div v-else-if="currentView === 'search'">
        <input 
          v-model="searchQuery"
          type="text" 
          placeholder="Produkt suchen..." 
          class="input input-bordered w-full mb-4" 
          autofocus
        />

        <div v-if="searchResults.length > 0" class="card bg-base-100 shadow-sm overflow-hidden">
          <ItemRow 
            v-for="item in searchResults" 
            :key="item.id" 
            :item="item" 
            :show-location="true" 
          />
        </div>
        <div v-else-if="searchQuery" class="text-center mt-10">
          Nichts gefunden für "{{ searchQuery }}"
        </div>
      </div>

    </div>

    <div class="btm-nav btm-nav-sm lg:hidden border-t border-base-200">
      <button :class="{'active': currentView === 'dashboard' || currentView === 'location'}" @click="goHome">
        <span class="text-xl">🏠</span>
      </button>
      <button class="active text-primary btn-circle btn -mt-8 shadow-lg border-4 border-base-200 h-14 w-14 bg-primary text-primary-content hover:bg-primary-focus">
        <span class="text-2xl">+</span>
      </button>
      <button :class="{'active': currentView === 'search'}" @click="currentView = 'search'">
        <span class="text-xl">🔍</span>
      </button>
    </div>

  </div>
</template>