<script setup lang="ts">
import { computed } from 'vue';
import { useTodos } from '../../composables/useTodos';
import { CheckCircleIcon } from '@heroicons/vue/24/outline';
import WidgetShell from './WidgetShell.vue';

const { todos } = useTodos();

const openTodosCount = computed(() => todos.value.filter(t => !t.is_completed).length);
const nextTodo = computed(() => todos.value.find(t => !t.is_completed));
</script>

<template>
  <WidgetShell title="Offene Aufgaben" :icon="CheckCircleIcon" tone="primary" clickable>
    <div class="flex items-end gap-2">
      <div class="text-5xl font-bold tabular-nums leading-none">{{ openTodosCount }}</div>
      <div class="text-xs text-base-content/50 pb-1">offen</div>
    </div>

    <div v-if="nextTodo" class="mt-4 px-3 py-2 bg-base-200 rounded-lg text-sm flex items-center gap-2 min-w-0">
      <span class="badge badge-primary badge-xs shrink-0">Nächste</span>
      <span class="truncate font-medium">{{ nextTodo.title }}</span>
    </div>
    <div v-else class="mt-4 text-sm text-base-content/40">Alles erledigt 🎉</div>
  </WidgetShell>
</template>
