<script setup lang="ts">
import { useDashboardStats } from '../../composables/useDashboardStats';
import { ExclamationTriangleIcon } from '@heroicons/vue/24/outline';
import WidgetStat from './WidgetStat.vue';

const { stats } = useDashboardStats();
</script>

<template>
  <WidgetStat title="Abgelaufen" :icon="ExclamationTriangleIcon" tone="error" :value="stats.expired"
    :unit="stats.expired === 1 ? 'Produkt' : 'Produkte'" zero-text="Nichts abgelaufen ✓" />
</template>
