<script setup lang="ts">
import WidgetShell from './WidgetShell.vue';

defineProps<{
  title: string;
  icon?: string;
}>();
</script>

<template>
  <WidgetShell tone="primary" clickable align="center">
    <div class="flex-1 flex flex-col items-center justify-center w-full -mt-2">
      <div class="text-4xl mb-2">{{ icon || '🔗' }}</div>
      <div class="font-bold text-base text-center">{{ title }}</div>
    </div>
  </WidgetShell>
</template>
