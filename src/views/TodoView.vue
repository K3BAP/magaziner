<script setup lang="ts">
import { ref, computed } from 'vue';
import { useTodos, type Todo } from '../composables/useTodos';
import { useAuth } from '../composables/useAuth';
import { useActiveMembers } from '../composables/useHouseholdMembers';
import { daysUntil } from '../utils/date';
import TodoRow from '../components/TodoRow.vue';
import TodoSheet from '../components/todos/TodoSheet.vue';
import EmptyState from '../components/ui/EmptyState.vue';
import SectionHeader from '../components/ui/SectionHeader.vue';
import Skeleton from '../components/ui/Skeleton.vue';
import { ArrowUpIcon, ChevronDownIcon, AdjustmentsHorizontalIcon, TrashIcon } from '@heroicons/vue/24/outline';

const { todos, addTodo, loading, deleteCompleted } = useTodos();
const { user } = useAuth();
const { members, ensureLoaded } = useActiveMembers();
ensureLoaded();

const newTitle = ref('');
const filter = ref<'all' | 'mine'>('all');
const showDone = ref(false);
const sheetOpen = ref(false);
const editing = ref<Todo | null>(null);
const sheetInitialTitle = ref('');

const visible = computed(() =>
  filter.value === 'mine'
    ? todos.value.filter((t) => !t.assignee_id || t.assignee_id === user.value?.id)
    : todos.value,
);

const sections = computed(() => {
  const open = visible.value.filter((t) => !t.is_completed);
  const overdue: Todo[] = [];
  const today: Todo[] = [];
  const upcoming: Todo[] = [];
  const someday: Todo[] = [];
  for (const t of open) {
    if (!t.due_date) someday.push(t);
    else {
      const d = daysUntil(t.due_date);
      if (d < 0) overdue.push(t);
      else if (d === 0) today.push(t);
      else upcoming.push(t);
    }
  }
  return [
    { key: 'overdue', title: 'Überfällig', items: overdue },
    { key: 'today', title: 'Heute', items: today },
    { key: 'upcoming', title: 'Demnächst', items: upcoming },
    { key: 'someday', title: someday.length && open.length === someday.length ? 'Offen' : 'Irgendwann', items: someday },
  ].filter((s) => s.items.length > 0);
});

const done = computed(() => visible.value.filter((t) => t.is_completed));
const openCount = computed(() => visible.value.length - done.value.length);

const quickAdd = async () => {
  const t = newTitle.value.trim();
  if (!t) return;
  newTitle.value = '';
  await addTodo(t);
};

const openDetails = () => {
  editing.value = null;
  sheetInitialTitle.value = newTitle.value;
  newTitle.value = '';
  sheetOpen.value = true;
};

const openEdit = (t: Todo) => {
  editing.value = t;
  sheetOpen.value = true;
};
</script>

<template>
  <div>
    <div v-if="members.length > 1" role="tablist" class="tabs tabs-box bg-base-100 mb-4 w-fit">
      <button role="tab" type="button" class="tab" :class="{ 'tab-active': filter === 'all' }" @click="filter = 'all'">Alle</button>
      <button role="tab" type="button" class="tab" :class="{ 'tab-active': filter === 'mine' }" @click="filter = 'mine'">Für mich</button>
    </div>

    <Skeleton v-if="loading && todos.length === 0" :rows="4" />

    <template v-else>
      <div class="flex flex-col gap-5">
        <section v-for="s in sections" :key="s.key">
          <SectionHeader :title="s.title" :count="s.items.length" />
          <div class="surface overflow-hidden" :class="s.key === 'overdue' ? 'ring-1 ring-error/30' : ''">
            <TransitionGroup name="list" tag="div" class="relative divide-y divide-base-200">
              <TodoRow v-for="t in s.items" :key="t.id" :todo="t" @edit="openEdit" />
            </TransitionGroup>
          </div>
        </section>
      </div>

      <EmptyState
        v-if="openCount === 0"
        icon="🎉"
        title="Alles erledigt!"
        :text="todos.length === 0 ? 'Leg unten deine erste Aufgabe an – auf Wunsch mit Datum, Wiederholung und Zuständigkeit.' : undefined"
      />

      <section v-if="done.length > 0" class="mt-6">
        <SectionHeader title="Erledigt" :count="done.length">
          <button type="button" class="btn btn-ghost btn-xs gap-1" @click="showDone = !showDone">
            <ChevronDownIcon class="h-4 w-4 transition-transform" :class="showDone ? '' : '-rotate-90'" />
            {{ showDone ? 'Einklappen' : 'Anzeigen' }}
          </button>
        </SectionHeader>
        <template v-if="showDone">
          <div class="surface overflow-hidden mb-3">
            <TransitionGroup name="list" tag="div" class="relative divide-y divide-base-200">
              <TodoRow v-for="t in done" :key="t.id" :todo="t" @edit="openEdit" />
            </TransitionGroup>
          </div>
          <button type="button" class="btn btn-sm bg-base-100 border-0 text-error gap-2 w-full" @click="deleteCompleted">
            <TrashIcon class="h-4 w-4" /> Erledigte löschen
          </button>
        </template>
      </section>
    </template>

    <Teleport to="body">
    <div class="addbar fixed inset-x-0 z-30 px-4 pointer-events-none">
      <form
        class="mx-auto max-w-2xl pointer-events-auto flex items-center gap-2 rounded-full bg-base-100 shadow-lg shadow-base-content/10 border border-base-300 pl-4 pr-1.5 py-1.5"
        @submit.prevent="quickAdd"
      >
        <input
          v-model="newTitle"
          class="flex-1 min-w-0 bg-transparent outline-none text-base py-1.5"
          placeholder="Neue Aufgabe …"
          autocomplete="off"
          enterkeyhint="send"
          aria-label="Neue Aufgabe"
        />
        <button type="button" class="btn btn-ghost btn-circle btn-sm h-9 w-9" aria-label="Mit Details anlegen" title="Datum, Wiederholung, Zuständigkeit" @click="openDetails">
          <AdjustmentsHorizontalIcon class="h-5 w-5" />
        </button>
        <button type="submit" class="btn btn-primary btn-circle btn-sm h-9 w-9" :disabled="!newTitle.trim()" aria-label="Hinzufügen">
          <ArrowUpIcon class="h-5 w-5 stroke-[2.5]" />
        </button>
      </form>
    </div>
    </Teleport>

    <TodoSheet :open="sheetOpen" :todo="editing" :initial-title="sheetInitialTitle" @close="sheetOpen = false" />
  </div>
</template>

<style scoped>
.addbar {
  bottom: calc(var(--tabbar-h, 0px) + var(--keyboard-inset, 0px) + 0.75rem);
}
</style>
