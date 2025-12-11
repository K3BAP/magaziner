<script setup lang="ts">
import { ref, computed, nextTick, onMounted } from 'vue';
import { useInventory } from '../composables/useInventory';
import ItemRow from '../components/ItemRow.vue';

const { items } = useInventory();

const globalSearchQuery = ref('');
const sortBy = ref<'name' | 'date'>('name');
const searchInputRef = ref<HTMLInputElement | null>(null);

// Focus search input automatically when view opens
onMounted(async () => {
  await nextTick();
  searchInputRef.value?.focus();
});

// Helper to find earliest date in an item's instances
const getEarliest = (item: any) => {
  if (!item.instances || item.instances.length === 0) return 9999999999999;
  const firstDate = item.instances[0].expiry_date;
  return firstDate ? new Date(firstDate).getTime() : 9999999999999;
};

const allItemsFiltered = computed(() => {
  // A) Filter
  let result = items.value.filter(i => 
    i.name.toLowerCase().includes(globalSearchQuery.value.toLowerCase())
  );

  // B) Sort
  return result.sort((a, b) => {
    if (sortBy.value === 'name') {
      return a.name.localeCompare(b.name);
    } else {
      return getEarliest(a) - getEarliest(b);
    }
  });
});
</script>

<template>
  <div>
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
</template>