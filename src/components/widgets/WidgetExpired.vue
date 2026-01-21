<script setup lang="ts">
import { useDashboardStats } from '../../composables/useDashboardStats';

const { stats } = useDashboardStats();
</script>

<template>
  <div 
    class="card bg-base-100 shadow-md transition-all h-full"
    :class="stats.expired > 0 ? 'cursor-pointer hover:shadow-lg hover:bg-red-50' : 'opacity-60'"
  >
    <div class="card-body p-4 items-center text-center justify-center">
       <div class="text-3xl">⚠️</div>
       <div class="text-2xl font-bold text-error">{{ stats.expired }}</div>
       <div class="text-xs text-gray-500">Abgelaufen</div>
    </div>
  </div>
</template>
