<script setup lang="ts">
import { computed } from 'vue';
import { useInventory } from '../../composables/useInventory';
import type { ActivityKind } from '../../composables/useInventory';
import WidgetShell from './WidgetShell.vue';
import {
  ClockIcon,
  PlusCircleIcon,
  BeakerIcon,
  MinusCircleIcon,
  TrashIcon,
} from '@heroicons/vue/24/outline';

const { recentActivity } = useInventory();

const entries = computed(() => recentActivity.value.slice(0, 5));

const iconFor = (kind: ActivityKind) => {
  switch (kind) {
    case 'added': return PlusCircleIcon;
    case 'opened': return BeakerIcon;
    case 'consumed': return MinusCircleIcon;
    case 'removed': return TrashIcon;
  }
};

const colorFor = (kind: ActivityKind) => {
  switch (kind) {
    case 'added': return 'text-success';
    case 'opened': return 'text-info';
    case 'consumed': return 'text-warning';
    case 'removed': return 'text-error';
  }
};

const labelFor = (kind: ActivityKind) => {
  switch (kind) {
    case 'added': return 'Hinzugefügt';
    case 'opened': return 'Geöffnet';
    case 'consumed': return 'Verbraucht';
    case 'removed': return 'Entfernt';
  }
};

const relativeTime = (iso: string) => {
  const diffMs = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diffMs / 60000);
  if (m < 1) return 'gerade eben';
  if (m < 60) return `vor ${m} Min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `vor ${h} Std`;
  const d = Math.floor(h / 24);
  if (d < 7) return `vor ${d} ${d === 1 ? 'Tag' : 'Tagen'}`;
  return new Date(iso).toLocaleDateString('de-DE');
};
</script>

<template>
  <WidgetShell title="Letzte Aktivität" :icon="ClockIcon" tone="info">
    <div v-if="entries.length === 0" class="text-sm text-base-content/40 py-4 text-center">
      Noch keine Aktivität.
    </div>
    <ul v-else class="flex flex-col divide-y divide-base-200">
      <li v-for="(e, i) in entries" :key="i" class="flex items-center gap-3 py-2">
        <component :is="iconFor(e.kind)" class="h-5 w-5 shrink-0" :class="colorFor(e.kind)" />
        <div class="flex-1 min-w-0">
          <div class="text-sm font-medium truncate">{{ e.item_name }}</div>
          <div class="text-xs text-base-content/50">{{ labelFor(e.kind) }}</div>
        </div>
        <div class="text-xs text-base-content/40 tabular-nums shrink-0">{{ relativeTime(e.at) }}</div>
      </li>
    </ul>
  </WidgetShell>
</template>
