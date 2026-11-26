<script setup lang="ts">
/** First-run intro + starter templates for Aufgaben. */
import { ref, computed, watch } from 'vue';
import BottomSheet from '../ui/BottomSheet.vue';
import { useChores, initialNextDue, type ChoreInput } from '../../composables/useChores';
import { useActiveMembers } from '../../composables/useHouseholdMembers';
import { toast } from '../../composables/useToast';
import { AREA_TEMPLATES } from '../../data/choreTemplates';
import { EFFORT_XP, intervalLabel } from '../../utils/game';
import { CheckIcon } from '@heroicons/vue/24/outline';

const props = defineProps<{ open: boolean; /** Skip the intro pages (opened via „Aus Vorlagen“). */ templatesOnly?: boolean }>();
const emit = defineEmits<{ (e: 'close'): void }>();

const { ensureAreas, addChores, chores, areaById } = useChores();
const { members } = useActiveMembers();

const INTRO = [
  {
    icon: '🫧',
    title: 'Frische statt Termine',
    text: 'Jede wiederkehrende Aufgabe hat einen Balken. Er läuft von grün bis rot, und wer die Aufgabe erledigt, setzt ihn zurück.',
  },
  {
    icon: '⭐',
    title: 'XP, Level & Münzen',
    text: 'Für jede Aufgabe gibt es XP je nach Aufwand. Pünktlich erledigt gibt es einen Bonus, und wer Überfälliges rettet, bekommt noch mehr.',
  },
  {
    icon: '🤝',
    title: 'Gemeinsam statt gegeneinander',
    text: 'Aufgaben können reihum gehen oder fair verteilt werden. Der Balken oben zeigt, wer diese Woche wie viel beigetragen hat.',
  },
];

const step = ref(0);
const key = (area: string, title: string) => `${area}::${title}`;
const selected = ref<Set<string>>(new Set());
const rotate = ref(true);
const saving = ref(false);

// Already present (same room + title) → shown greyed out.
const existing = computed(
  () => new Set(chores.value.map((c) => key(areaById(c.area_id)?.name ?? '', c.title).toLowerCase())),
);
const exists = (area: string, title: string) => existing.value.has(key(area, title).toLowerCase());

watch(
  () => props.open,
  (o) => {
    if (!o) return;
    step.value = props.templatesOnly ? INTRO.length : 0;
    const all = new Set<string>();
    for (const a of AREA_TEMPLATES)
      for (const c of a.chores) if (!exists(a.name, c.title)) all.add(key(a.name, c.title));
    selected.value = all;
    rotate.value = members.value.length > 1;
  },
  { immediate: true },
);

const toggle = (k: string) => {
  const next = new Set(selected.value);
  if (next.has(k)) next.delete(k);
  else next.add(k);
  selected.value = next;
};

const toggleArea = (area: string) => {
  const keys = AREA_TEMPLATES.find((a) => a.name === area)!.chores.map((c) => key(area, c.title));
  const allOn = keys.every((k) => selected.value.has(k));
  const next = new Set(selected.value);
  for (const k of keys) {
    if (allOn) next.delete(k);
    else next.add(k);
  }
  selected.value = next;
};

const create = async () => {
  if (saving.value || selected.value.size === 0) return;
  saving.value = true;
  try {
    const usedAreas = AREA_TEMPLATES.filter((a) => a.chores.some((c) => selected.value.has(key(a.name, c.title))));
    const areaIds = await ensureAreas(usedAreas.map((a) => ({ name: a.name, emoji: a.emoji })));
    const multi = members.value.length > 1 && rotate.value;
    const everyone = members.value.map((m) => m.user_id);
    const inputs: ChoreInput[] = [];
    let i = 0;
    for (const a of usedAreas) {
      for (const c of a.chores) {
        if (!selected.value.has(key(a.name, c.title))) continue;
        // Spread start states so not everything turns red on the same day.
        const ago = Math.floor(c.interval * ((i * 0.37) % 1));
        inputs.push({
          title: c.title,
          notes: null,
          area_id: areaIds.get(a.name.toLowerCase()) ?? null,
          kind: 'recurring',
          interval_days: c.interval,
          next_due: initialNextDue(c.interval, ago),
          due_date: null,
          effort: c.effort,
          unpopular: !!c.unpopular,
          assign_mode: multi ? 'rotate' : 'open',
          rotation: multi ? everyone : [],
          // Alternate who starts, so the first week is already balanced.
          current_assignee: multi ? everyone[i % everyone.length] : null,
        });
        i++;
      }
    }
    if (await addChores(inputs)) {
      toast.success(`${inputs.length} Aufgaben angelegt`);
      emit('close');
    }
  } catch (e) {
    toast.error('Vorlagen konnten nicht angelegt werden.', e);
  } finally {
    saving.value = false;
  }
};
</script>

<template>
  <BottomSheet :open="open" :title="step < INTRO.length ? 'Willkommen bei Aufgaben' : 'Startpaket'" @close="emit('close')">
    <div v-if="step < INTRO.length" class="flex flex-col items-center text-center gap-3 py-6">
      <div class="text-6xl" aria-hidden="true">{{ INTRO[step].icon }}</div>
      <p class="font-display text-xl font-bold">{{ INTRO[step].title }}</p>
      <p class="text-base-content/70 max-w-sm">{{ INTRO[step].text }}</p>
      <div class="flex gap-1.5 mt-2" aria-hidden="true">
        <span v-for="(_, i) in INTRO" :key="i" class="h-1.5 rounded-full transition-all" :class="i === step ? 'w-5 bg-primary' : 'w-1.5 bg-base-content/20'" />
      </div>
    </div>

    <div v-else class="flex flex-col gap-4">
      <p class="text-sm text-base-content/70">
        Such dir aus, was bei euch anfällt. Intervall und Aufwand lassen sich später bei jeder Aufgabe ändern.
      </p>
      <label v-if="members.length > 1" class="surface p-3 flex items-center justify-between gap-3 cursor-pointer">
        <span>
          <span class="block text-sm font-semibold">Abwechselnd verteilen</span>
          <span class="block text-xs text-base-content/55">Reihum zwischen allen. Sonst sind die Aufgaben offen für alle.</span>
        </span>
        <input v-model="rotate" type="checkbox" class="toggle toggle-primary" />
      </label>
      <section v-for="a in AREA_TEMPLATES" :key="a.name">
        <button type="button" class="flex items-center gap-2 mb-1.5 px-1 w-full text-left" @click="toggleArea(a.name)">
          <span aria-hidden="true">{{ a.emoji }}</span>
          <span class="text-xs font-bold uppercase tracking-wider text-base-content/55 flex-1">{{ a.name }}</span>
          <span class="text-xs text-primary font-semibold">Alle</span>
        </button>
        <div class="surface divide-y divide-base-200 overflow-hidden">
          <button
            v-for="c in a.chores"
            :key="c.title"
            type="button"
            class="w-full flex items-center gap-3 px-3 py-2.5 text-left active:bg-base-200"
            :class="exists(a.name, c.title) ? 'opacity-40' : ''"
            :disabled="exists(a.name, c.title)"
            @click="toggle(key(a.name, c.title))"
          >
            <span
              class="h-5 w-5 rounded-md border-2 flex items-center justify-center shrink-0"
              :class="selected.has(key(a.name, c.title)) ? 'bg-primary border-primary text-primary-content' : 'border-base-content/30'"
            >
              <CheckIcon v-if="selected.has(key(a.name, c.title))" class="h-3.5 w-3.5 stroke-[3]" />
            </span>
            <span class="flex-1 min-w-0">
              <span class="block text-sm font-medium truncate">{{ c.title }}<span v-if="c.unpopular" title="unbeliebt"> 😖</span></span>
              <span class="block text-xs text-base-content/55">{{ intervalLabel(c.interval) }}</span>
            </span>
            <span class="text-xs font-bold text-primary tabular-nums">{{ EFFORT_XP[c.effort] }} XP</span>
          </button>
        </div>
      </section>
    </div>

    <template #footer>
      <template v-if="step < INTRO.length">
        <button type="button" class="btn btn-ghost mr-auto" @click="step = INTRO.length">Überspringen</button>
        <button type="button" class="btn btn-primary min-w-28" @click="step++">Weiter</button>
      </template>
      <template v-else>
        <button type="button" class="btn btn-ghost mr-auto" @click="emit('close')">Selbst anlegen</button>
        <button type="button" class="btn btn-primary min-w-28" :disabled="selected.size === 0 || saving" @click="create">
          {{ selected.size }} übernehmen
        </button>
      </template>
    </template>
  </BottomSheet>
</template>
