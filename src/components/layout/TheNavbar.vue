<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useInventory } from '../../composables/useInventory';

const route = useRoute();
const router = useRouter();
const { locations } = useInventory(); 

const pageTitle = computed(() => {
  switch (route.name) {
    case 'dashboard': return 'Übersicht';
    case 'locations': return 'Vorräte';
    case 'allItems': return 'Alle Vorräte'; // 1. Umbenannt
    case 'todos': return 'Aufgaben';
    case 'location': 
      const loc = locations.value.find(l => l.id === route.params.id);
      return loc?.name || 'Lade...';
    default: return 'Magaziner';
  }
});

const goUp = () => {
  if (route.name === 'location') {
    router.push({ name: 'locations' });
  } else {
    router.push({ name: 'dashboard' });
  }
};

const goToSearch = () => router.push({ name: 'allItems' });

const showSearch = computed(() => {
  return ['dashboard', 'locations', 'location'].includes(route.name as string);
});

// Helper für Titel-Klick
const goHome = () => router.push({ name: 'dashboard' });
</script>

<template>
  <div class="navbar bg-base-100 shadow-sm sticky top-0 z-10">
    <div class="flex-none">
      <button v-if="route.name === 'location'" @click="goUp" class="btn btn-square btn-ghost">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
      </button>
      
      <label v-else for="main-drawer" class="btn btn-square btn-ghost drawer-button">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="inline-block w-6 h-6 stroke-current"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
      </label>
    </div>
    
    <div class="flex-1">
      <a @click="goHome" class="btn btn-ghost normal-case text-xl truncate cursor-pointer">
        {{ pageTitle }}
      </a>
    </div>
    
    <div class="flex-none">
      <button v-if="showSearch" class="btn btn-ghost btn-circle" @click="goToSearch">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
      </button>
    </div>
  </div>
</template>