<script setup lang="ts">
import { type ShoppingItem, useShoppingList } from '../composables/useShoppingList';

const props = defineProps<{ item: ShoppingItem }>();
const { toggleItem, deleteItem } = useShoppingList();

// Formatierung für das Datum
const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};
</script>

<template>
  <div class="flex items-center justify-between p-4 border-b border-base-200 last:border-0 hover:bg-base-200/30 transition-colors group">
    
    <div class="flex items-center gap-3">
      <input 
        type="checkbox" 
        :checked="item.is_completed" 
        @change="toggleItem(item)"
        class="checkbox checkbox-primary checkbox-sm"
      />
      
      <div class="flex flex-col">
        <span 
          class="font-medium text-lg transition-all"
          :class="{ 'line-through text-gray-400': item.is_completed }"
        >
          {{ item.title }}
        </span>
        <span class="text-xs text-gray-400">
          Erstellt: {{ formatDate(item.created_at) }}
        </span>
      </div>
    </div>

    <!-- Löschen-Button nur sichtbar bei Hover (auf Mobile immer sichtbar machen, falls gewünscht, aber DaisyUI hat keine hover-media-queries out of box) -->
    <!-- Wir nutzen group-hover -->
    <button 
      @click="deleteItem(item.id)" 
      class="btn btn-ghost btn-sm text-error opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity"
      title="Löschen"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
    </button>

  </div>
</template>
