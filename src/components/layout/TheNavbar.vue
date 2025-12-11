<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useInventory } from '../../composables/useInventory';

const route = useRoute();
const router = useRouter();
const { locations } = useInventory(); // To look up location name by ID

// Compute title based on current route
const pageTitle = computed(() => {
  switch (route.name) {
    case 'dashboard': return 'Mein Vorrat';
    case 'allItems': return 'Alle Produkte';
    case 'todos': return 'Aufgaben';
    case 'location': 
      const loc = locations.value.find(l => l.id === route.params.id);
      return loc?.name || 'Lade...';
    default: return 'Magaziner';
  }
});

// Navigation Helpers
const goBack = () => router.push({ name: 'dashboard' });
const goToSearch = () => router.push({ name: 'allItems' });
</script>

<template>
  <div class="navbar bg-base-100 shadow-sm sticky top-0 z-10">
    <div class="flex-none">
      <button v-if="route.name === 'location'" @click="goBack" class="btn btn-square btn-ghost">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
      </button>
      
      <label v-else for="main-drawer" class="btn btn-square btn-ghost drawer-button">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="inline-block w-6 h-6 stroke-current"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
      </label>
    </div>
    
    <div class="flex-1">
      <span class="btn btn-ghost normal-case text-xl truncate">
        {{ pageTitle }}
      </span>
    </div>
    
    <div class="flex-none">
      <button v-if="route.name !== 'allItems'" class="btn btn-ghost btn-circle" @click="goToSearch">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
      </button>
      <button v-else class="btn btn-ghost btn-circle" @click="goBack">
         <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
      </button>
    </div>
  </div>
</template>