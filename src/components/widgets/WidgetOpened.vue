<script setup lang="ts">
import { useDashboardStats } from '../../composables/useDashboardStats';
import { BeakerIcon } from '@heroicons/vue/24/outline';
import WidgetShell from './WidgetShell.vue';

const { stats } = useDashboardStats();
</script>

<template>
  <WidgetShell
    title="Geöffnet"
    :icon="BeakerIcon"
    tone="info"
    :clickable="stats.opened > 0"
    :muted="stats.opened === 0"
    align="center"
  >
    <div class="flex-1 flex flex-col items-center justify-center w-full">
      <div class="text-5xl font-bold tabular-nums text-info leading-none">{{ stats.opened }}</div>
      <div class="text-xs text-base-content/50 mt-2">angebrochen</div>
    </div>
  </WidgetShell>
</template>
