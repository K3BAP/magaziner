<script setup lang="ts">
defineProps<{ icon?: string; title: string; text?: string; compact?: boolean }>();
</script>

<template>
  <div class="flex flex-col items-center text-center" :class="compact ? 'py-6 gap-1' : 'py-12 gap-2'">
    <div v-if="icon" :class="compact ? 'text-3xl' : 'text-5xl mb-1'" aria-hidden="true">{{ icon }}</div>
    <slot name="icon" />
    <p class="font-semibold" :class="compact ? 'text-sm' : 'text-base'">{{ title }}</p>
    <p v-if="text" class="text-sm text-base-content/60 max-w-xs">{{ text }}</p>
    <div v-if="$slots.default" class="mt-3"><slot /></div>
  </div>
</template>
