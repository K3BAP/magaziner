<script setup lang="ts">
import { useDashboardStats } from '../../composables/useDashboardStats';
import { ClockIcon } from '@heroicons/vue/24/outline';
import WidgetStat from './WidgetStat.vue';

const { stats } = useDashboardStats();
</script>

<template>
  <WidgetStat title="Bald fällig" :icon="ClockIcon" tone="warning" :value="stats.soon"
    unit="in 14 Tagen" zero-text="Alles frisch ✓" />
</template>
