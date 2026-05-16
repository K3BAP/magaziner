<script setup lang="ts">
import { useDashboardStats } from '../../composables/useDashboardStats';
import { ClockIcon } from '@heroicons/vue/24/outline';
import WidgetShell from './WidgetShell.vue';

const { stats } = useDashboardStats();
</script>

<template>
  <WidgetShell
    title="Bald fällig"
    :icon="ClockIcon"
    tone="warning"
    :clickable="stats.soon > 0"
    :muted="stats.soon === 0"
    align="center"
  >
    <div class="flex-1 flex flex-col items-center justify-center w-full">
      <div class="text-5xl font-bold tabular-nums text-warning leading-none">{{ stats.soon }}</div>
      <div class="text-xs text-base-content/50 mt-2">in 14 Tagen</div>
    </div>
  </WidgetShell>
</template>
