<script setup lang="ts">
import { useDashboardStats } from '../../composables/useDashboardStats';
import { BeakerIcon } from '@heroicons/vue/24/outline';
import WidgetStat from './WidgetStat.vue';

const { stats } = useDashboardStats();
</script>

<template>
  <WidgetStat title="Geöffnet" :icon="BeakerIcon" tone="info" :value="stats.opened"
    unit="angebrochen" zero-text="Nichts angebrochen" />
</template>
