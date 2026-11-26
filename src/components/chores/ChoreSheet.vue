<script setup lang="ts">
/** Create or edit a chore: kind, interval/due date, room, effort, assignment. */
import { ref, watch, computed } from 'vue';
import BottomSheet from '../ui/BottomSheet.vue';
import UserAvatar from '../ui/UserAvatar.vue';
import { useChores, initialNextDue, type Chore, type ChoreInput } from '../../composables/useChores';
import { useActiveMembers } from '../../composables/useHouseholdMembers';
import { useAuth } from '../../composables/useAuth';
import { todayLocalISO, addDaysISO } from '../../utils/date';
import {
  EFFORTS,
  EFFORT_LABEL,
  EFFORT_XP,
  INTERVAL_PRESETS,
  ASSIGN_LABEL,
  ASSIGN_HINT,
  type AssignMode,
  type ChoreKind,
  type Effort,
} from '../../utils/game';
import { AREA_EMOJIS } from '../../data/choreTemplates';
import { TrashIcon, PlusIcon, CheckIcon } from '@heroicons/vue/24/outline';

const props = defineProps<{ open: boolean; chore?: Chore | null; initialTitle?: string; initialAreaId?: string | null }>();
const emit = defineEmits<{ (e: 'close'): void }>();

const { addChore, updateChore, archiveChore, areas, addArea } = useChores();
const { members, ensureLoaded } = useActiveMembers();
const { user } = useAuth();

const title = ref('');
const kind = ref<ChoreKind>('recurring');
const interval = ref(7);
const customInterval = ref(false);
const lastDoneAgo = ref<number | null>(0);
const nextDue = ref('');
const dueDate = ref('');
const areaId = ref<string | null>(null);
const effort = ref<Effort>('small');
const unpopular = ref(false);
const mode = ref<AssignMode>('open');
const rotation = ref<string[]>([]);
const assignee = ref<string | null>(null);
const notes = ref('');
const saving = ref(false);

const newAreaOpen = ref(false);
const newAreaName = ref('');
const newAreaEmoji = ref('🏠');

const isEdit = computed(() => !!props.chore);
const multi = computed(() => members.value.length > 1);
const today = todayLocalISO();

watch(
  () => props.open,
  (o) => {
    if (!o) return;
    ensureLoaded();
    const c = props.chore;
    title.value = c?.title ?? props.initialTitle ?? '';
    kind.value = c?.kind ?? 'recurring';
    interval.value = c?.interval_days ?? 7;
    customInterval.value = !INTERVAL_PRESETS.some((p) => p.days === interval.value);
    lastDoneAgo.value = 0;
    nextDue.value = c?.next_due ?? '';
    dueDate.value = c?.due_date ?? '';
    areaId.value = c ? c.area_id : props.initialAreaId ?? null;
    effort.value = c?.effort ?? 'small';
    unpopular.value = c?.unpopular ?? false;
    mode.value = c?.assign_mode ?? (members.value.length > 1 ? 'rotate' : 'open');
    rotation.value = c?.rotation?.length ? [...c.rotation] : members.value.map((m) => m.user_id);
    assignee.value = c?.current_assignee ?? null;
    if (!c && mode.value === 'rotate') assignee.value = user.value?.id ?? rotation.value[0] ?? null;
    notes.value = c?.notes ?? '';
    newAreaOpen.value = false;
  },
  { immediate: true },
);

const LAST_DONE = [
  { label: 'Heute', value: 0 },
  { label: 'Gestern', value: 1 },
  { label: 'Vor 3 Tagen', value: 3 },
  { label: 'Vor 1 Woche', value: 7 },
  { label: 'Noch nie', value: null },
];

const quickDates = [
  { label: 'Heute', value: today },
  { label: 'Morgen', value: addDaysISO(today, 1) },
  { label: 'In 1 Woche', value: addDaysISO(today, 7) },
];

const pickInterval = (d: number) => {
  interval.value = d;
  customInterval.value = false;
};

const toggleRotation = (id: string) => {
  rotation.value = rotation.value.includes(id) ? rotation.value.filter((x) => x !== id) : [...rotation.value, id];
  if (assignee.value && !rotation.value.includes(assignee.value)) assignee.value = rotation.value[0] ?? null;
  if (!assignee.value) assignee.value = rotation.value[0] ?? null;
};

const setMode = (m: AssignMode) => {
  mode.value = m;
  if (m === 'open') assignee.value = null;
  else if (m === 'fixed') assignee.value = assignee.value ?? user.value?.id ?? null;
  else {
    if (rotation.value.length === 0) rotation.value = members.value.map((x) => x.user_id);
    if (!assignee.value || !rotation.value.includes(assignee.value)) assignee.value = rotation.value[0] ?? null;
  }
};

const memberName = (id: string) => members.value.find((m) => m.user_id === id)?.display_name ?? '?';
const memberAvatar = (id: string) => members.value.find((m) => m.user_id === id)?.avatar_url ?? null;

const createArea = async () => {
  const a = await addArea(newAreaName.value, newAreaEmoji.value);
  if (a) {
    areaId.value = a.id;
    newAreaOpen.value = false;
    newAreaName.value = '';
  }
};

const valid = computed(() => !!title.value.trim() && (kind.value === 'once' || (interval.value >= 1 && interval.value <= 365)));

const save = async () => {
  if (!valid.value || saving.value) return;
  saving.value = true;
  const recurring = kind.value === 'recurring';
  const assignMode: AssignMode = multi.value ? mode.value : 'open';
  const rot = assignMode === 'rotate' || assignMode === 'fair' ? rotation.value : [];
  const input: ChoreInput = {
    title: title.value.trim(),
    notes: notes.value.trim() || null,
    area_id: areaId.value,
    kind: kind.value,
    interval_days: recurring ? interval.value : null,
    next_due: recurring
      ? isEdit.value && props.chore?.kind === 'recurring' && nextDue.value
        ? nextDue.value
        : initialNextDue(interval.value, lastDoneAgo.value)
      : null,
    due_date: recurring ? null : dueDate.value || null,
    effort: effort.value,
    unpopular: unpopular.value,
    assign_mode: assignMode,
    rotation: rot,
    current_assignee: assignMode === 'open' ? null : assignee.value,
  };
  try {
    if (props.chore) {
      const patch: Record<string, unknown> = { ...input };
      if (recurring) patch.completed_at = null;
      await updateChore(props.chore.id, patch as Partial<ChoreInput>);
    } else {
      await addChore(input);
    }
    emit('close');
  } finally {
    saving.value = false;
  }
};

const remove = () => {
  if (props.chore) archiveChore(props.chore.id);
  emit('close');
};
</script>

<template>
  <BottomSheet :open="open" :title="isEdit ? 'Aufgabe bearbeiten' : 'Neue Aufgabe'" @close="emit('close')">
    <form class="flex flex-col gap-5" @submit.prevent="save">
      <input
        v-model="title"
        class="input input-lg w-full font-medium"
        placeholder="z. B. Bad putzen"
        autocomplete="off"
        enterkeyhint="done"
        maxlength="120"
        :autofocus="!isEdit"
      />

      <div role="tablist" class="tabs tabs-box w-full grid grid-cols-2">
        <button type="button" role="tab" class="tab" :class="{ 'tab-active': kind === 'recurring' }" @click="kind = 'recurring'">Wiederkehrend</button>
        <button type="button" role="tab" class="tab" :class="{ 'tab-active': kind === 'once' }" @click="kind = 'once'">Einmalig</button>
      </div>

      <template v-if="kind === 'recurring'">
        <div class="flex flex-col gap-2">
          <span class="text-sm font-semibold">Wie oft?</span>
          <div class="flex flex-wrap gap-1.5">
            <button
              v-for="p in INTERVAL_PRESETS"
              :key="p.days"
              type="button"
              class="btn btn-sm rounded-full border-0"
              :class="!customInterval && interval === p.days ? 'btn-primary' : 'bg-base-200'"
              @click="pickInterval(p.days)"
            >
              {{ p.label }}
            </button>
            <button
              type="button"
              class="btn btn-sm rounded-full border-0"
              :class="customInterval ? 'btn-primary' : 'bg-base-200'"
              @click="customInterval = true"
            >
              Eigene
            </button>
          </div>
          <label v-if="customInterval" class="flex items-center gap-2 text-sm">
            Alle
            <input v-model.number="interval" type="number" min="1" max="365" inputmode="numeric" class="input input-sm w-20" />
            Tage
          </label>
        </div>

        <div v-if="!isEdit || chore?.kind !== 'recurring'" class="flex flex-col gap-2">
          <span class="text-sm font-semibold">Zuletzt gemacht</span>
          <div class="flex flex-wrap gap-1.5">
            <button
              v-for="l in LAST_DONE"
              :key="l.label"
              type="button"
              class="btn btn-sm rounded-full border-0"
              :class="lastDoneAgo === l.value ? 'btn-primary' : 'bg-base-200'"
              @click="lastDoneAgo = l.value"
            >
              {{ l.label }}
            </button>
          </div>
        </div>
        <label v-else class="flex flex-col gap-2">
          <span class="text-sm font-semibold">Nächste Fälligkeit</span>
          <input v-model="nextDue" type="date" class="input w-full" />
        </label>
      </template>

      <div v-else class="flex flex-col gap-2">
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
          <button v-if="dueDate" type="button" class="btn btn-sm btn-ghost rounded-full" @click="dueDate = ''">Kein Datum</button>
        </div>
      </div>

      <div class="flex flex-col gap-2">
        <span class="text-sm font-semibold">Aufwand</span>
        <div class="grid grid-cols-4 gap-1.5">
          <button
            v-for="e in EFFORTS"
            :key="e"
            type="button"
            class="btn btn-sm h-auto py-2 flex-col gap-0 rounded-2xl border-0"
            :class="effort === e ? 'btn-primary' : 'bg-base-200'"
            @click="effort = e"
          >
            <span>{{ EFFORT_LABEL[e] }}</span>
            <span class="text-[11px] font-normal opacity-75">{{ EFFORT_XP[e] }} XP</span>
          </button>
        </div>
        <label class="flex items-center justify-between gap-3 mt-1 cursor-pointer">
          <span>
            <span class="block text-sm font-medium">Unbeliebt</span>
            <span class="block text-xs text-base-content/55">Macht niemand gern: +50 % XP</span>
          </span>
          <input v-model="unpopular" type="checkbox" class="toggle toggle-primary" />
        </label>
      </div>

      <div class="flex flex-col gap-2">
        <span class="text-sm font-semibold">Raum</span>
        <div class="flex flex-wrap gap-1.5">
          <button
            type="button"
            class="btn btn-sm rounded-full border-0"
            :class="areaId === null ? 'btn-primary' : 'bg-base-200'"
            @click="areaId = null"
          >
            Ohne
          </button>
          <button
            v-for="a in areas"
            :key="a.id"
            type="button"
            class="btn btn-sm rounded-full border-0 gap-1"
            :class="areaId === a.id ? 'btn-primary' : 'bg-base-200'"
            @click="areaId = a.id"
          >
            <span aria-hidden="true">{{ a.emoji }}</span>{{ a.name }}
          </button>
          <button type="button" class="btn btn-sm btn-ghost rounded-full gap-1" @click="newAreaOpen = !newAreaOpen">
            <PlusIcon class="h-4 w-4" /> Raum
          </button>
        </div>
        <div v-if="newAreaOpen" class="surface p-3 flex flex-col gap-2">
          <div class="flex flex-wrap gap-1">
            <button
              v-for="em in AREA_EMOJIS"
              :key="em"
              type="button"
              class="h-9 w-9 rounded-xl text-lg"
              :class="newAreaEmoji === em ? 'bg-primary/15 ring-2 ring-primary' : 'bg-base-200'"
              @click="newAreaEmoji = em"
            >
              {{ em }}
            </button>
          </div>
          <div class="flex gap-2">
            <input v-model="newAreaName" class="input input-sm flex-1" placeholder="z. B. Balkon" maxlength="40" @keydown.enter.prevent="createArea" />
            <button type="button" class="btn btn-sm btn-primary" :disabled="!newAreaName.trim()" @click="createArea">Anlegen</button>
          </div>
        </div>
      </div>

      <div v-if="multi" class="flex flex-col gap-2">
        <span class="text-sm font-semibold">Wer ist dran?</span>
        <div role="tablist" class="tabs tabs-box w-full grid grid-cols-4">
          <button
            v-for="m in (['rotate', 'fair', 'fixed', 'open'] as AssignMode[])"
            :key="m"
            type="button"
            role="tab"
            class="tab px-1 text-sm"
            :class="{ 'tab-active': mode === m }"
            @click="setMode(m)"
          >
            {{ ASSIGN_LABEL[m] }}
          </button>
        </div>
        <p class="text-xs text-base-content/55">{{ ASSIGN_HINT[mode] }}</p>

        <template v-if="mode === 'rotate' || mode === 'fair'">
          <span class="text-xs font-semibold text-base-content/60 mt-1">Wer macht mit? <span v-if="mode === 'rotate'">(Reihenfolge = Antippen)</span></span>
          <div class="flex flex-wrap gap-1.5">
            <button
              v-for="m in members"
              :key="m.user_id"
              type="button"
              class="btn btn-sm rounded-full border-0 gap-1.5 pl-1"
              :class="rotation.includes(m.user_id) ? 'btn-primary' : 'bg-base-200'"
              @click="toggleRotation(m.user_id)"
            >
              <UserAvatar :name="m.display_name" :src="m.avatar_url" size="xs" />
              {{ m.display_name }}
              <span v-if="mode === 'rotate' && rotation.includes(m.user_id)" class="text-[11px] opacity-75">{{ rotation.indexOf(m.user_id) + 1 }}.</span>
            </button>
          </div>
          <span class="text-xs font-semibold text-base-content/60 mt-1">Jetzt dran</span>
          <div class="flex flex-wrap gap-1.5">
            <button
              v-for="id in rotation"
              :key="id"
              type="button"
              class="btn btn-sm rounded-full border-0 gap-1.5 pl-1"
              :class="assignee === id ? 'btn-secondary' : 'bg-base-200'"
              @click="assignee = id"
            >
              <UserAvatar :name="memberName(id)" :src="memberAvatar(id)" size="xs" />
              {{ memberName(id) }}
              <CheckIcon v-if="assignee === id" class="h-3.5 w-3.5" />
            </button>
          </div>
        </template>

        <div v-else-if="mode === 'fixed'" class="flex flex-wrap gap-1.5">
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

      <label class="flex flex-col gap-2">
        <span class="text-sm font-semibold">Notiz</span>
        <textarea v-model="notes" class="textarea w-full" rows="2" maxlength="1000" placeholder="Optional, z. B. welches Putzmittel" />
      </label>
      <button type="submit" class="hidden" />
    </form>

    <template #footer>
      <button v-if="isEdit" type="button" class="btn btn-ghost text-error mr-auto gap-1" @click="remove">
        <TrashIcon class="h-5 w-5" /> Löschen
      </button>
      <button type="button" class="btn btn-primary min-w-28" :disabled="!valid || saving" @click="save">
        {{ isEdit ? 'Speichern' : 'Hinzufügen' }}
      </button>
    </template>
  </BottomSheet>
</template>
