<script setup lang="ts">
import { onMounted, computed } from 'vue';
import { useShoppingList } from '../../composables/useShoppingList';

const { items, fetchItems, loading } = useShoppingList();

onMounted(() => {
  fetchItems();
});

const itemCount = computed(() => items.value.filter(i => !i.is_completed).length);
</script>

<template>
  <div 
    class="card bg-base-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer border-t-4 border-t-accent h-full"
    title="Zur Einkaufsliste"
  >
    <div class="card-body p-4 flex flex-col items-center justify-center">
      <div v-if="loading" class="loading loading-spinner loading-md text-accent"></div>
      <template v-else>
        <div class="text-4xl font-bold text-accent">{{ itemCount }}</div>
        <div class="text-xs uppercase font-bold tracking-wider text-gray-500 mt-1">Einkaufsliste</div>
      </template>
    </div>
  </div>
</template>
