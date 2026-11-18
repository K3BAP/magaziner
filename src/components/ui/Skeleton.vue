<script setup lang="ts">
withDefaults(defineProps<{ rows?: number; height?: string }>(), { rows: 3, height: '3.25rem' });
</script>

<template>
  <div class="surface overflow-hidden divide-y divide-base-200" aria-busy="true" aria-label="Lädt">
    <div v-for="i in rows" :key="i" class="flex items-center gap-3 px-4" :style="{ height }">
      <div class="skeleton h-5 w-5 rounded-full shrink-0" />
      <div class="skeleton h-3.5 rounded-full" :style="{ width: `${40 + ((i * 37) % 45)}%` }" />
    </div>
  </div>
</template>
