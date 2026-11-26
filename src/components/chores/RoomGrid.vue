<script setup lang="ts">
/** Room tiles with a condition ring (mean freshness of the room's recurring chores). */
import { computed } from 'vue';
import { useChores } from '../../composables/useChores';
import { choreCondition, freshness } from '../../utils/game';
import EmptyState from '../ui/EmptyState.vue';

const emit = defineEmits<{ (e: 'select', areaId: string): void }>();
const { areas, openChores } = useChores();

const tiles = computed(() =>
  areas.value.map((a) => {
    const inRoom = openChores.value.filter((c) => c.area_id === a.id);
    const conds = inRoom.map(choreCondition).filter((x): x is number => x !== null);
    const cond = conds.length ? conds.reduce((s, x) => s + x, 0) / conds.length : null;
    const due = inRoom.filter((c) => {
      const f = freshness(c);
      return f && f.daysLeft <= 0;
    }).length;
    return { ...a, cond, due, count: inRoom.length };
  }),
);

const R = 26;
const CIRC = 2 * Math.PI * R;
const ringClass = (cond: number | null) =>
  cond === null ? 'stroke-base-content/20' : cond >= 0.7 ? 'stroke-success' : cond >= 0.4 ? 'stroke-warning' : 'stroke-error';
</script>

<template>
  <EmptyState
    v-if="tiles.length === 0"
    icon="🏠"
    title="Noch keine Räume"
    text="Ordne Aufgaben im Editor einem Raum zu oder nutze das Startpaket – dann siehst du hier, wie es um jeden Raum steht."
  />
  <div v-else class="grid grid-cols-2 gap-3">
    <button
      v-for="t in tiles"
      :key="t.id"
      type="button"
      class="surface pressable p-4 flex flex-col items-center gap-2 text-center"
      @click="emit('select', t.id)"
    >
      <div class="relative h-16 w-16">
        <svg viewBox="0 0 64 64" class="absolute inset-0 -rotate-90" aria-hidden="true">
          <circle cx="32" cy="32" :r="R" fill="none" stroke-width="5" class="stroke-base-content/10" />
          <circle
            cx="32"
            cy="32"
            :r="R"
            fill="none"
            stroke-width="5"
            stroke-linecap="round"
            class="transition-[stroke-dashoffset] duration-700"
            :class="ringClass(t.cond)"
            :stroke-dasharray="CIRC"
            :stroke-dashoffset="CIRC * (1 - (t.cond ?? 0))"
          />
        </svg>
        <span class="absolute inset-0 flex items-center justify-center text-2xl" aria-hidden="true">{{ t.emoji }}</span>
      </div>
      <span class="font-semibold leading-tight">{{ t.name }}</span>
      <span class="text-xs text-base-content/60 tabular-nums">
        <template v-if="t.cond !== null">{{ Math.round(t.cond * 100) }} % sauber</template>
        <template v-else>{{ t.count }} {{ t.count === 1 ? 'Aufgabe' : 'Aufgaben' }}</template>
        <span v-if="t.due" class="text-error font-semibold"> · {{ t.due }} fällig</span>
      </span>
    </button>
  </div>
</template>
