<script setup lang="ts">
import { type ShoppingItem, useShoppingList } from '../composables/useShoppingList';
import { useShoppingCategories } from '../composables/useShoppingCategories';

defineProps<{ item: ShoppingItem }>();
const { toggleItem, deleteItem, setItemCategory } = useShoppingList();
const { categories } = useShoppingCategories();
</script>

<template>
  <div class="flex items-center justify-between p-4 border-b border-base-200 last:border-0 hover:bg-base-200/30 transition-colors group">

    <div class="flex items-center gap-3 min-w-0">
      <input
        type="checkbox"
        :checked="item.is_completed"
        @change="toggleItem(item)"
        class="checkbox checkbox-primary checkbox-sm"
      />

      <span
        class="font-medium text-lg transition-all truncate"
        :class="{ 'line-through text-gray-400': item.is_completed }"
      >
        {{ item.title }}
      </span>
    </div>

    <div class="flex items-center gap-1 shrink-0">
      <!-- Kategorie-Wechsel -->
      <div class="dropdown dropdown-end">
        <button
          tabindex="0"
          class="btn btn-ghost btn-sm btn-circle opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity"
          title="Kategorie ändern"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5a1.99 1.99 0 011.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.99 1.99 0 013 12V7a4 4 0 014-4z" /></svg>
        </button>
        <ul tabindex="0" class="dropdown-content z-20 menu p-2 shadow-lg bg-base-100 rounded-box w-56 max-h-72 overflow-y-auto flex-nowrap">
          <li class="menu-title text-xs">Kategorie</li>
          <li v-for="cat in categories" :key="cat.id">
            <a :class="{ 'active': item.category_id === cat.id }" @click="setItemCategory(item, cat.id)">
              <span>{{ cat.icon }}</span> {{ cat.name }}
            </a>
          </li>
        </ul>
      </div>

      <!-- Löschen -->
      <button
        @click="deleteItem(item.id)"
        class="btn btn-ghost btn-sm btn-circle text-error opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity"
        title="Löschen"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
      </button>
    </div>

  </div>
</template>
