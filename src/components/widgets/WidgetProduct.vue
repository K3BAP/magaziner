<script setup lang="ts">
import { computed } from 'vue';
import { useInventory } from '../../composables/useInventory';

const props = defineProps<{
    productId: string;
}>();

const { items } = useInventory();

const item = computed(() => items.value.find(i => i.id === props.productId));

const totalQuantity = computed(() => {
    if (!item.value) return 0;
    return item.value.instances.reduce((sum, inst) => sum + inst.quantity, 0);
});

const nextExpiry = computed(() => {
    if (!item.value || !item.value.instances.length) return null;
    // Instances are already sorted by date in useInventory
    const upcoming = item.value.instances.find(i => i.expiry_date);
    return upcoming ? upcoming.expiry_date : null;
});

const formatDate = (d: string) => new Date(d).toLocaleDateString('de-DE');
</script>

<template>
  <div v-if="item" class="card bg-base-100 shadow-md h-full">
     <div class="card-body p-4">
        <h3 class="card-title text-sm uppercase text-gray-400 truncate">{{ item.name }}</h3>
        
        <div class="flex items-end gap-2 mt-2">
           <div class="text-4xl font-bold">{{ totalQuantity }}</div>
           <div class="text-sm pb-1 opacity-70">Stück</div>
        </div>

        <div v-if="nextExpiry" class="mt-4 text-xs bg-base-200 p-2 rounded flex justify-between">
           <span>Nächstes MHD:</span>
           <span class="font-mono font-bold">{{ formatDate(nextExpiry) }}</span>
        </div>
        <div v-else class="mt-4 text-xs text-gray-400">
           Kein MHD hinterlegt
        </div>
     </div>
  </div>
  <div v-else class="card bg-base-100 shadow-md h-full opacity-50">
      <div class="card-body p-4 flex items-center justify-center">
          <span class="text-sm text-gray-400">Produkt nicht gefunden</span>
      </div>
  </div>
</template>
