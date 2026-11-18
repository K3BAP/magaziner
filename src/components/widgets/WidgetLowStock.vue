<script setup lang="ts">
import { useDashboardStats } from '../../composables/useDashboardStats';
import { ArrowTrendingDownIcon } from '@heroicons/vue/24/outline';
import WidgetStat from './WidgetStat.vue';

const { stats } = useDashboardStats();
</script>

<template>
  <WidgetStat title="Knapp" :icon="ArrowTrendingDownIcon" tone="accent" :value="stats.low"
    unit="unter Mindestbestand" zero-text="Genug auf Lager ✓" />
</template>
