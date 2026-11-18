<script setup lang="ts">
defineProps<{ title: string; count?: number; icon?: string }>();
</script>

<template>
  <div class="flex items-center gap-2 px-1 mb-2 mt-1">
    <span v-if="icon" class="text-base" aria-hidden="true">{{ icon }}</span>
    <h2 class="text-xs font-bold uppercase tracking-wider text-base-content/55">{{ title }}</h2>
    <span v-if="count !== undefined" class="text-xs font-semibold text-base-content/40">{{ count }}</span>
    <div class="flex-1" />
    <slot />
  </div>
</template>
