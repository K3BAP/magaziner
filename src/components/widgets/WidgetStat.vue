<script setup lang="ts">
import type { Component } from 'vue';
import WidgetShell from './WidgetShell.vue';

defineProps<{
  title: string;
  icon: Component;
  tone: 'error' | 'warning' | 'info' | 'accent' | 'primary' | 'success';
  value: number;
  unit: string;
  /** Shown instead of a big „0“. */
  zeroText: string;
}>();

const valueClass = {
  error: 'text-error',
  warning: 'text-warning',
  info: 'text-info',
  accent: 'text-accent',
  primary: 'text-primary',
  success: 'text-success',
} as const;
</script>

<template>
  <WidgetShell :title="title" :icon="icon" :tone="value > 0 ? tone : 'neutral'" :clickable="value > 0">
    <div v-if="value > 0" class="flex items-baseline gap-1.5 mt-auto">
      <span class="font-display text-4xl tabular-nums leading-none" :class="valueClass[tone]">{{ value }}</span>
      <span class="text-xs text-base-content/55">{{ unit }}</span>
    </div>
    <div v-else class="mt-auto text-sm text-base-content/50">{{ zeroText }}</div>
  </WidgetShell>
</template>
