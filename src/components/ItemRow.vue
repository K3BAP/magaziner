<script setup lang="ts">
import { defineProps } from 'vue';
import type { Item } from '../composables/useInventory';
import { useInventory } from '../composables/useInventory';

const props = defineProps<{ item: Item; showLocation?: boolean }>();
const { updateQuantity, getLocationName } = useInventory();
</script>

<template>
  <div class="flex items-center justify-between p-3 bg-base-100 border-b border-base-200 last:border-0">
    
    <div>
      <div class="font-medium text-lg">{{ item.name }}</div>
      <div v-if="showLocation" class="text-xs text-gray-500 badge badge-ghost gap-1">
        {{ getLocationName(item.locationId) }}
      </div>
    </div>

    <div class="flex items-center gap-3">
      <span class="font-bold text-xl w-8 text-center" :class="{'text-error': item.quantity === 0}">
        {{ item.quantity }}
      </span>

      <div class="join">
        <button 
          @click="updateQuantity(item.id, -1)" 
          class="btn btn-sm btn-square join-item"
          :disabled="item.quantity <= 0">
          -
        </button>
        <button 
          @click="updateQuantity(item.id, 1)" 
          class="btn btn-sm btn-square join-item btn-primary">
          +
        </button>
      </div>
    </div>
  </div>
</template>