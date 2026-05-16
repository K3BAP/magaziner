<script setup lang="ts">
import { useDashboardStats } from '../../composables/useDashboardStats';
import { ExclamationTriangleIcon } from '@heroicons/vue/24/outline';
import WidgetShell from './WidgetShell.vue';

const { stats } = useDashboardStats();
</script>

<template>
  <WidgetShell
    title="Abgelaufen"
    :icon="ExclamationTriangleIcon"
    tone="error"
    :clickable="stats.expired > 0"
    :muted="stats.expired === 0"
    align="center"
  >
    <div class="flex-1 flex flex-col items-center justify-center w-full">
      <div class="text-5xl font-bold tabular-nums text-error leading-none">{{ stats.expired }}</div>
      <div class="text-xs text-base-content/50 mt-2">{{ stats.expired === 1 ? 'Produkt' : 'Produkte' }}</div>
    </div>
  </WidgetShell>
</template>
