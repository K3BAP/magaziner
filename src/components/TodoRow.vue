<script setup lang="ts">
import { computed } from 'vue';
import { useTodos, RECURRENCE_LABEL, type Todo } from '../composables/useTodos';
import { useActiveMembers } from '../composables/useHouseholdMembers';
import { daysUntil, relativeDayLabel } from '../utils/date';
import SwipeRow from './ui/SwipeRow.vue';
import UserAvatar from './ui/UserAvatar.vue';
import { CheckIcon, ArrowPathIcon, CalendarIcon } from '@heroicons/vue/24/outline';

const props = defineProps<{ todo: Todo }>();
const emit = defineEmits<{ (e: 'edit', todo: Todo): void }>();
const { toggleTodo, deleteTodo } = useTodos();
const { memberById } = useActiveMembers();

const assignee = computed(() => memberById(props.todo.assignee_id));
const dueClass = computed(() => {
  if (!props.todo.due_date || props.todo.is_completed) return 'text-base-content/55';
  const d = daysUntil(props.todo.due_date);
  if (d < 0) return 'text-error font-semibold';
  if (d === 0) return 'text-warning font-semibold';
  return 'text-base-content/55';
});
const pending = computed(() => props.todo.id.startsWith('temp-'));

const onToggle = () => {
  navigator.vibrate?.(8);
  toggleTodo(props.todo);
};
</script>

<template>
  <SwipeRow :disabled="pending" @swipe="deleteTodo(todo.id)">
    <div class="flex items-center gap-3 pl-3 pr-4 min-h-14" :class="pending ? 'opacity-60' : ''">
      <button
        type="button"
        class="h-11 w-11 -my-1 shrink-0 flex items-center justify-center"
        :aria-label="todo.is_completed ? 'Als offen markieren' : 'Erledigt'"
        :aria-pressed="todo.is_completed"
        @click="onToggle"
      >
        <span
          class="h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all"
          :class="todo.is_completed ? 'bg-success border-success text-success-content' : 'border-base-content/30'"
        >
          <CheckIcon v-if="todo.is_completed" class="h-4 w-4 stroke-[3]" />
        </span>
      </button>

      <button type="button" class="flex-1 min-w-0 text-left py-2.5" @click="emit('edit', todo)">
        <span
          class="block text-[17px] leading-snug"
          :class="todo.is_completed ? 'line-through text-base-content/40' : ''"
        >{{ todo.title }}</span>
        <span
          v-if="todo.due_date || todo.recurrence"
          class="flex items-center gap-2 text-xs mt-0.5"
        >
          <span v-if="todo.due_date" class="flex items-center gap-1" :class="dueClass">
            <CalendarIcon class="h-3.5 w-3.5" />{{ relativeDayLabel(todo.due_date) }}
          </span>
          <span v-if="todo.recurrence" class="flex items-center gap-1 text-base-content/55">
            <ArrowPathIcon class="h-3.5 w-3.5" />{{ RECURRENCE_LABEL[todo.recurrence] }}
          </span>
        </span>
      </button>

      <UserAvatar v-if="assignee" :name="assignee.display_name" :src="assignee.avatar_url" size="sm" />
    </div>
  </SwipeRow>
</template>
