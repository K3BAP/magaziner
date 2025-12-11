<script setup lang="ts">
import { watchEffect } from 'vue';
import { useAuth } from './composables/useAuth';
import { useInventory } from './composables/useInventory';
import { useTodos } from './composables/useTodos'; // Ensure this exists
import { useRoute } from 'vue-router';
import TheNavbar from './components/layout/TheNavbar.vue';
import TheDrawer from './components/layout/TheDrawer.vue';

const { user } = useAuth();
const { fetchInventory } = useInventory();
const { fetchTodos } = useTodos();
const route = useRoute();

// Global Data Fetching
watchEffect(() => {
  if (user.value) {
    fetchInventory();
    fetchTodos();
  }
});
</script>

<template>
  <div v-if="route.name === 'login'">
    <router-view />
  </div>

  <div v-else class="drawer">
    <input id="main-drawer" type="checkbox" class="drawer-toggle" />
    
    <div class="drawer-content flex flex-col min-h-screen bg-base-200">
      <TheNavbar />
      
      <div class="p-4 container mx-auto max-w-md flex-grow">
        <router-view />
      </div>
    </div> 
    
    <TheDrawer />
    
    </div>
</template>