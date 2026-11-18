<script setup lang="ts">
/** Create or edit a task: title, due date, assignee, repetition. */
import { ref, watch, computed } from 'vue';
import BottomSheet from '../ui/BottomSheet.vue';
import UserAvatar from '../ui/UserAvatar.vue';
import { useTodos, RECURRENCE_LABEL, type Todo, type Recurrence } from '../../composables/useTodos';
import { useActiveMembers } from '../../composables/useHouseholdMembers';
import { todayLocalISO, addDaysISO } from '../../utils/date';
import { TrashIcon } from '@heroicons/vue/24/outline';

const props = defineProps<{ open: boolean; todo?: Todo | null; initialTitle?: string }>();
const emit = defineEmits<{ (e: 'close'): void }>();

const { addTodo, updateTodo, deleteTodo } = useTodos();
const { members, ensureLoaded } = useActiveMembers();

const title = ref('');
const dueDate = ref<string>('');
const assignee = ref<string | null>(null);
const recurrence = ref<Recurrence | null>(null);

const isEdit = computed(() => !!props.todo);

watch(
  () => props.open,
  (o) => {
    if (!o) return;
    ensureLoaded();
    title.value = props.todo?.title ?? props.initialTitle ?? '';
    dueDate.value = props.todo?.due_date ?? '';
    assignee.value = props.todo?.assignee_id ?? null;
    recurrence.value = props.todo?.recurrence ?? null;
  },
  { immediate: true },
);

const today = todayLocalISO();
const quickDates = [
  { label: 'Heute', value: today },
  { label: 'Morgen', value: addDaysISO(today, 1) },
  { label: 'In 1 Woche', value: addDaysISO(today, 7) },
];

const setRecurrence = (r: Recurrence | null) => {
  recurrence.value = recurrence.value === r ? null : r;
  // A repeating task needs an anchor date.
  if (recurrence.value && !dueDate.value) dueDate.value = today;
};

const save = async () => {
  if (!title.value.trim()) return;
  const fields = {
    due_date: dueDate.value || null,
    assignee_id: assignee.value,
    recurrence: recurrence.value,
  };
  if (props.todo) await updateTodo(props.todo.id, { title: title.value.trim(), ...fields });
  else await addTodo(title.value, fields);
  emit('close');
};

const remove = () => {
  if (props.todo) deleteTodo(props.todo.id);
  emit('close');
};
</script>

<template>
  <BottomSheet :open="open" :title="isEdit ? 'Aufgabe bearbeiten' : 'Neue Aufgabe'" @close="emit('close')">
    <form class="flex flex-col gap-5" @submit.prevent="save">
      <input
        v-model="title"
        class="input input-lg w-full font-medium"
        placeholder="z. B. Müll rausbringen"
        autocomplete="off"
        enterkeyhint="done"
        :autofocus="!isEdit"
      />

      <div class="flex flex-col gap-2">
        <span class="text-sm font-semibold">Fällig</span>
        <div class="flex flex-wrap items-center gap-1.5">
          <button
            v-for="q in quickDates"
            :key="q.label"
            type="button"
            class="btn btn-sm rounded-full border-0"
            :class="dueDate === q.value ? 'btn-primary' : 'bg-base-200'"
            @click="dueDate = dueDate === q.value ? '' : q.value"
          >
            {{ q.label }}
          </button>
          <input v-model="dueDate" type="date" class="input input-sm w-auto rounded-full" aria-label="Datum wählen" />
          <button v-if="dueDate" type="button" class="btn btn-sm btn-ghost rounded-full" @click="dueDate = ''; recurrence = null">Kein Datum</button>
        </div>
      </div>

      <div class="flex flex-col gap-2">
        <span class="text-sm font-semibold">Wiederholen</span>
        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="(label, key) in RECURRENCE_LABEL"
            :key="key"
            type="button"
            class="btn btn-sm rounded-full border-0"
            :class="recurrence === key ? 'btn-primary' : 'bg-base-200'"
            @click="setRecurrence(key)"
          >
            {{ label }}
          </button>
        </div>
      </div>

      <div v-if="members.length > 1" class="flex flex-col gap-2">
        <span class="text-sm font-semibold">Wer kümmert sich?</span>
        <div class="flex flex-wrap gap-1.5">
          <button
            type="button"
            class="btn btn-sm rounded-full border-0"
            :class="assignee === null ? 'btn-primary' : 'bg-base-200'"
            @click="assignee = null"
          >
            Alle
          </button>
          <button
            v-for="m in members"
            :key="m.user_id"
            type="button"
            class="btn btn-sm rounded-full border-0 gap-1.5 pl-1"
            :class="assignee === m.user_id ? 'btn-primary' : 'bg-base-200'"
            @click="assignee = m.user_id"
          >
            <UserAvatar :name="m.display_name" :src="m.avatar_url" size="xs" />
            {{ m.display_name }}
          </button>
        </div>
      </div>
      <button type="submit" class="hidden" />
    </form>

    <template #footer>
      <button v-if="isEdit" type="button" class="btn btn-ghost text-error mr-auto gap-1" @click="remove">
        <TrashIcon class="h-5 w-5" /> Löschen
      </button>
      <button type="button" class="btn btn-primary min-w-28" :disabled="!title.trim()" @click="save">
        {{ isEdit ? 'Speichern' : 'Hinzufügen' }}
      </button>
    </template>
  </BottomSheet>
</template>
