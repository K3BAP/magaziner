<script setup lang="ts">
import { computed } from 'vue';
import { useTodos } from '../../composables/useTodos';
import { CheckCircleIcon } from '@heroicons/vue/24/outline';
import { daysUntil, relativeDayLabel } from '../../utils/date';
import WidgetShell from './WidgetShell.vue';

const { openTodos, openCount } = useTodos();
const next = computed(() => openTodos.value.slice(0, 2));
const dueNow = computed(() => openTodos.value.filter((t) => t.due_date && daysUntil(t.due_date) <= 0).length);
</script>

<template>
  <WidgetShell title="Aufgaben" :icon="CheckCircleIcon" tone="success" clickable>
    <template v-if="openCount > 0">
      <div class="flex items-baseline gap-1.5">
        <span class="font-display text-4xl tabular-nums leading-none">{{ openCount }}</span>
        <span class="text-xs text-base-content/55">offen</span>
        <span v-if="dueNow" class="ml-auto text-xs font-semibold text-error">{{ dueNow }} fällig</span>
      </div>
      <ul class="mt-3 flex flex-col gap-1">
        <li v-for="t in next" :key="t.id" class="text-sm truncate flex items-center gap-1.5">
          <span class="h-1.5 w-1.5 rounded-full bg-base-content/25 shrink-0" />
          <span class="truncate">{{ t.title }}</span>
          <span v-if="t.due_date" class="ml-auto shrink-0 text-xs text-base-content/50">{{ relativeDayLabel(t.due_date) }}</span>
        </li>
      </ul>
    </template>
    <div v-else class="mt-auto text-sm text-base-content/50">Alles erledigt 🎉</div>
  </WidgetShell>
</template>
