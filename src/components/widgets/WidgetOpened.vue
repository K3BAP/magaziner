<script setup lang="ts">
import { useDashboardStats } from '../../composables/useDashboardStats';

const { stats } = useDashboardStats();
</script>

<template>
   <div 
     class="card bg-base-100 shadow-md transition-all h-full"
     :class="stats.opened > 0 ? 'cursor-pointer hover:shadow-lg hover:bg-blue-50' : 'opacity-60'"
   >
     <div class="card-body p-4 flex-row items-center justify-between">
        <div class="text-left">
           <div class="text-2xl font-bold text-info">{{ stats.opened }}</div>
           <div class="text-xs text-gray-500">Produkte geöffnet</div>
        </div>
        <div class="text-3xl">🥄</div>
     </div>
   </div>
</template>
