<script setup lang="ts">
defineProps<{
  title: string;
  icon?: string;
  colorClass?: string;
}>();
</script>

<template>
  <div 
    class="card bg-base-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer border border-base-200 h-full justify-center"
  >
    <div class="card-body p-4 items-center text-center"> 
       <div class="text-3xl mb-2">{{ icon || '🔗' }}</div>
       <h3 class="font-bold text-lg">{{ title }}</h3>
    </div>
  </div>
</template>
