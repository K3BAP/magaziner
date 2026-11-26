<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useChores, type Chore } from '../composables/useChores';
import { useGame } from '../composables/useGame';
import { useAuth } from '../composables/useAuth';
import { useActiveMembers } from '../composables/useHouseholdMembers';
import { freshness } from '../utils/game';
import ChoreRow from '../components/chores/ChoreRow.vue';
import ChoreSheet from '../components/chores/ChoreSheet.vue';
import TeamCard from '../components/chores/TeamCard.vue';
import OnboardingSheet from '../components/chores/OnboardingSheet.vue';
import RoomGrid from '../components/chores/RoomGrid.vue';
import QuestBoard from '../components/chores/QuestBoard.vue';
import VacationSheet from '../components/chores/VacationSheet.vue';
import WeeklyRecapSheet from '../components/chores/WeeklyRecapSheet.vue';
import UserAvatar from '../components/ui/UserAvatar.vue';
import SectionHeader from '../components/ui/SectionHeader.vue';
import Skeleton from '../components/ui/Skeleton.vue';
import EmptyState from '../components/ui/EmptyState.vue';
import {
  ArrowUpIcon,
  ChevronDownIcon,
  AdjustmentsHorizontalIcon,
  TrashIcon,
  SparklesIcon,
  ArrowUturnLeftIcon,
} from '@heroicons/vue/24/outline';

const { chores, areas, recent, loading, loaded, addChore, undo, archiveCompletedOnce, areaById } = useChores();
const { status } = useGame();
const { user } = useAuth();
const { members, memberById, ensureLoaded } = useActiveMembers();
ensureLoaded();

const newTitle = ref('');
const filter = ref<'mine' | 'all'>('all');
const areaFilter = ref<string | null>(null);
const showLater = ref(false);
const showHistory = ref(false);
const sheetOpen = ref(false);
const editing = ref<Chore | null>(null);
const sheetInitialTitle = ref('');
const onboardingOpen = ref(false);
const templatesOnly = ref(false);
const vacationOpen = ref(false);

// Sub-view lives in the URL (?view=rooms|quests) so links and push targets can open it.
type View = 'list' | 'rooms' | 'quests';
const route = useRoute();
const router = useRouter();
const view = computed<View>(() => {
  const v = route.query.view;
  return v === 'rooms' || v === 'quests' ? v : 'list';
});
const setView = (v: View) => router.replace({ query: { ...route.query, view: v === 'list' ? undefined : v } });
const VIEWS: { key: View; label: string }[] = [
  { key: 'list', label: 'Aufgaben' },
  { key: 'rooms', label: 'Räume' },
  { key: 'quests', label: 'Quests' },
];
const questBadge = computed(() => (status.value?.quests ?? []).filter((q) => !q.completed_at).length);

const pickRoom = (areaId: string) => {
  areaFilter.value = areaId;
  setView('list');
};

const visible = computed(() =>
  chores.value.filter((c) => {
    if (areaFilter.value && c.area_id !== areaFilter.value) return false;
    if (filter.value === 'mine' && c.current_assignee && c.current_assignee !== user.value?.id) return false;
    return true;
  }),
);

const open = computed(() => visible.value.filter((c) => !(c.kind === 'once' && c.completed_at)));
const doneOnce = computed(() => chores.value.filter((c) => c.kind === 'once' && c.completed_at));

const urgency = (c: Chore) => {
  const f = freshness(c);
  return f ? f.ratio : -1;
};

const sections = computed(() => {
  const late: Chore[] = [];
  const today: Chore[] = [];
  const soon: Chore[] = [];
  const later: Chore[] = [];
  const someday: Chore[] = [];
  for (const c of open.value) {
    const f = freshness(c);
    if (!f) someday.push(c);
    else if (f.state === 'overdue' || f.state === 'due') late.push(c);
    else if (f.state === 'today') today.push(c);
    else if (f.state === 'soon') soon.push(c);
    else later.push(c);
  }
  const byUrgency = (a: Chore, b: Chore) => urgency(b) - urgency(a) || a.title.localeCompare(b.title, 'de');
  late.sort(byUrgency);
  today.sort(byUrgency);
  soon.sort(byUrgency);
  later.sort(byUrgency);
  someday.sort((a, b) => b.created_at.localeCompare(a.created_at));
  return { late, today, soon, later, someday };
});

const mainSections = computed(() =>
  [
    { key: 'late', title: 'Überfällig', items: sections.value.late },
    { key: 'today', title: 'Heute', items: sections.value.today },
    { key: 'soon', title: 'Bald', items: sections.value.soon },
    { key: 'someday', title: 'Einmalig', items: sections.value.someday },
  ].filter((s) => s.items.length > 0),
);

const nothingDue = computed(
  () => !sections.value.late.length && !sections.value.today.length && !sections.value.soon.length && !sections.value.someday.length,
);

const history = computed(() => recent.value.slice(0, 30));
const canUndo = (r: { user_id: string | null; done_at: string; chore_id: string | null }) => {
  if (r.user_id !== user.value?.id) return false;
  if (Date.now() - new Date(r.done_at).getTime() > 24 * 3600_000) return false;
  // Only the latest completion of a chore can be taken back.
  const c = chores.value.find((x) => x.id === r.chore_id);
  return !c || !c.last_done_at || new Date(c.last_done_at).getTime() === new Date(r.done_at).getTime();
};

const relativeTime = (iso: string) => {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return 'gerade eben';
  if (m < 60) return `vor ${m} Min.`;
  const h = Math.floor(m / 60);
  if (h < 24) return `vor ${h} Std.`;
  const d = Math.floor(h / 24);
  return d === 1 ? 'gestern' : `vor ${d} Tagen`;
};
const nameOf = (id: string | null) => (id === user.value?.id ? 'Du' : memberById(id)?.display_name ?? 'Jemand');

const quickAdd = async () => {
  const t = newTitle.value.trim();
  if (!t) return;
  newTitle.value = '';
  await addChore({
    title: t,
    notes: null,
    area_id: areaFilter.value,
    kind: 'once',
    interval_days: null,
    next_due: null,
    due_date: null,
    effort: 'small',
    unpopular: false,
    assign_mode: 'open',
    rotation: [],
    current_assignee: null,
  });
};

const openDetails = () => {
  editing.value = null;
  sheetInitialTitle.value = newTitle.value;
  newTitle.value = '';
  sheetOpen.value = true;
};

const openEdit = (c: Chore) => {
  editing.value = c;
  sheetOpen.value = true;
};

const openTemplates = (only: boolean) => {
  templatesOnly.value = only;
  onboardingOpen.value = true;
};
</script>

<template>
  <div class="flex flex-col gap-4">
    <TeamCard v-if="status && members.length" @vacation="vacationOpen = true" />

    <div v-if="chores.length" role="tablist" class="tabs tabs-box bg-base-100 w-full grid grid-cols-3">
      <button
        v-for="v in VIEWS"
        :key="v.key"
        role="tab"
        type="button"
        class="tab gap-1.5"
        :class="{ 'tab-active': view === v.key }"
        :aria-selected="view === v.key"
        @click="setView(v.key)"
      >
        {{ v.label }}
        <span v-if="v.key === 'quests' && questBadge" class="badge badge-xs badge-accent">{{ questBadge }}</span>
      </button>
    </div>

    <RoomGrid v-if="view === 'rooms' && chores.length" @select="pickRoom" />
    <QuestBoard v-else-if="view === 'quests' && chores.length" @vacation="vacationOpen = true" />

    <Skeleton v-if="!loaded && loading" :rows="5" />

    <template v-else-if="loaded && chores.length === 0">
      <section class="surface p-5 flex flex-col items-center text-center gap-2">
        <div class="text-5xl" aria-hidden="true">🧹✨</div>
        <p class="font-display text-xl font-bold mt-1">Haushalt, aber als Spiel</p>
        <p class="text-sm text-base-content/65 max-w-sm">
          Sammle XP für jede Aufgabe, steig im Level auf und verteilt die Arbeit fair. Leg mit dem Startpaket los oder erstell eigene Aufgaben.
        </p>
        <button type="button" class="btn btn-primary mt-3 gap-2" @click="openTemplates(false)">
          <SparklesIcon class="h-5 w-5" /> Startpaket ansehen
        </button>
      </section>
    </template>

    <template v-else-if="view === 'list'">
      <div class="flex flex-col gap-2">
        <div v-if="members.length > 1" role="tablist" class="tabs tabs-box bg-base-100 w-fit">
          <button role="tab" type="button" class="tab" :class="{ 'tab-active': filter === 'all' }" @click="filter = 'all'">Alle</button>
          <button role="tab" type="button" class="tab" :class="{ 'tab-active': filter === 'mine' }" @click="filter = 'mine'">Für mich</button>
        </div>
        <div v-if="areas.length" class="flex gap-1.5 overflow-x-auto -mx-4 px-4 pb-1 no-scrollbar">
          <button
            type="button"
            class="btn btn-sm rounded-full border-0 shrink-0"
            :class="areaFilter === null ? 'btn-primary' : 'bg-base-100'"
            @click="areaFilter = null"
          >
            Alle Räume
          </button>
          <button
            v-for="a in areas"
            :key="a.id"
            type="button"
            class="btn btn-sm rounded-full border-0 gap-1 shrink-0"
            :class="areaFilter === a.id ? 'btn-primary' : 'bg-base-100'"
            @click="areaFilter = areaFilter === a.id ? null : a.id"
          >
            <span aria-hidden="true">{{ a.emoji }}</span>{{ a.name }}
          </button>
        </div>
      </div>

      <section v-for="s in mainSections" :key="s.key">
        <SectionHeader :title="s.title" :count="s.items.length" />
        <div class="surface overflow-hidden" :class="s.key === 'late' ? 'ring-1 ring-error/30' : ''">
          <TransitionGroup name="list" tag="div" class="relative divide-y divide-base-200">
            <ChoreRow v-for="c in s.items" :key="c.id" :chore="c" :show-area="!areaFilter" @edit="openEdit" />
          </TransitionGroup>
        </div>
      </section>

      <EmptyState
        v-if="nothingDue"
        compact
        icon="🌿"
        title="Gerade ist alles frisch"
        :text="sections.later.length ? 'Nichts steht an – genieß die Pause.' : undefined"
      />

      <section v-if="sections.later.length">
        <SectionHeader title="Später" :count="sections.later.length">
          <button type="button" class="btn btn-ghost btn-xs gap-1" @click="showLater = !showLater">
            <ChevronDownIcon class="h-4 w-4 transition-transform" :class="showLater ? '' : '-rotate-90'" />
            {{ showLater ? 'Einklappen' : 'Anzeigen' }}
          </button>
        </SectionHeader>
        <div v-if="showLater" class="surface overflow-hidden">
          <TransitionGroup name="list" tag="div" class="relative divide-y divide-base-200">
            <ChoreRow v-for="c in sections.later" :key="c.id" :chore="c" :show-area="!areaFilter" @edit="openEdit" />
          </TransitionGroup>
        </div>
      </section>

      <section v-if="history.length || doneOnce.length">
        <SectionHeader title="Verlauf" :count="history.length">
          <button type="button" class="btn btn-ghost btn-xs gap-1" @click="showHistory = !showHistory">
            <ChevronDownIcon class="h-4 w-4 transition-transform" :class="showHistory ? '' : '-rotate-90'" />
            {{ showHistory ? 'Einklappen' : 'Anzeigen' }}
          </button>
        </SectionHeader>
        <template v-if="showHistory">
          <ul v-if="history.length" class="surface divide-y divide-base-200 overflow-hidden mb-3">
            <li v-for="r in history" :key="r.id" class="flex items-center gap-3 px-3 py-2.5">
              <UserAvatar :name="memberById(r.user_id)?.display_name ?? nameOf(r.user_id)" :src="memberById(r.user_id)?.avatar_url" size="sm" />
              <div class="flex-1 min-w-0 text-sm leading-snug">
                <p class="truncate">
                  <span class="font-semibold">{{ nameOf(r.user_id) }}</span> ·
                  <span v-if="areaById(r.area_id)" class="mr-1" aria-hidden="true">{{ areaById(r.area_id)!.emoji }}</span>{{ r.chore_title }}
                </p>
                <p class="text-xs text-base-content/50">
                  {{ relativeTime(r.done_at) }}<span v-if="r.flags.includes('rescue')"> · 🦸 Rettung</span><span v-else-if="r.flags.includes('on_time')"> · ⏱ pünktlich</span>
                </p>
              </div>
              <span class="text-xs font-bold text-primary tabular-nums">+{{ r.xp }}</span>
              <button
                v-if="canUndo(r)"
                type="button"
                class="btn btn-ghost btn-circle btn-sm"
                aria-label="Rückgängig"
                title="Rückgängig"
                @click="undo(r.id)"
              >
                <ArrowUturnLeftIcon class="h-4 w-4" />
              </button>
            </li>
          </ul>
          <button
            v-if="doneOnce.length"
            type="button"
            class="btn btn-sm bg-base-100 border-0 text-error gap-2 w-full"
            @click="archiveCompletedOnce"
          >
            <TrashIcon class="h-4 w-4" /> Erledigte einmalige Aufgaben löschen ({{ doneOnce.length }})
          </button>
        </template>
      </section>

      <div class="flex flex-wrap justify-center gap-1">
        <button type="button" class="btn btn-ghost btn-sm gap-2 text-base-content/60" @click="openTemplates(true)">
          <SparklesIcon class="h-4 w-4" /> Aus Vorlagen hinzufügen
        </button>
        <button type="button" class="btn btn-ghost btn-sm gap-2 text-base-content/60" @click="vacationOpen = true">
          <span aria-hidden="true">🏖️</span> Urlaub & Pause
        </button>
      </div>
    </template>

    <Teleport to="body">
      <div v-if="view === 'list'" class="addbar fixed inset-x-0 z-30 px-4 pointer-events-none">
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
          <button
            type="button"
            class="btn btn-ghost btn-circle btn-sm h-9 w-9"
            aria-label="Mit Details anlegen"
            title="Wiederholung, Aufwand, Zuteilung"
            @click="openDetails"
          >
            <AdjustmentsHorizontalIcon class="h-5 w-5" />
          </button>
          <button type="submit" class="btn btn-primary btn-circle btn-sm h-9 w-9" :disabled="!newTitle.trim()" aria-label="Hinzufügen">
            <ArrowUpIcon class="h-5 w-5 stroke-[2.5]" />
          </button>
        </form>
      </div>
    </Teleport>

    <ChoreSheet :open="sheetOpen" :chore="editing" :initial-title="sheetInitialTitle" :initial-area-id="areaFilter" @close="sheetOpen = false" />
    <OnboardingSheet :open="onboardingOpen" :templates-only="templatesOnly" @close="onboardingOpen = false" />
    <VacationSheet :open="vacationOpen" @close="vacationOpen = false" />
    <WeeklyRecapSheet />
  </div>
</template>

<style scoped>
.addbar {
  bottom: calc(var(--tabbar-h, 0px) + var(--keyboard-inset, 0px) + 0.75rem);
}
.no-scrollbar {
  scrollbar-width: none;
}
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
</style>
