<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useShoppingList } from '../composables/useShoppingList';
import ShoppingListRow from '../components/ShoppingListRow.vue';

const { items, fetchItems, addItem, loading } = useShoppingList();
const newItemTitle = ref('');

onMounted(() => {
  fetchItems();
});

const handleAddItem = async () => {
  if (!newItemTitle.value.trim()) return;
  await addItem(newItemTitle.value);
  newItemTitle.value = ''; // Clear input
};
</script>

<template>
  <div>


    <div class="join w-full mb-6 shadow-sm">
      <input 
        v-model="newItemTitle" 
        @keyup.enter="handleAddItem"
        class="input input-bordered join-item w-full" 
        placeholder="Neuer Eintrag (z.B. Milch)..." 
      />
      <button @click="handleAddItem" class="btn btn-primary join-item">
        Hinzufügen
      </button>
    </div>

    <div v-if="loading && items.length === 0" class="flex justify-center py-4">
       <span class="loading loading-spinner"></span>
    </div>

    <div v-else class="card bg-base-100 shadow-sm overflow-hidden">
       <div v-if="items.length > 0">
          <ShoppingListRow v-for="item in items" :key="item.id" :item="item" />
       </div>
       
       <div v-else class="p-10 text-center opacity-50 flex flex-col items-center gap-2">
          <span class="text-4xl">🛒</span>
          <span>Einkaufsliste leer!</span>
       </div>
    </div>
  </div>
</template>
