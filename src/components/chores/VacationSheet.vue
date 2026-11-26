<script setup lang="ts">
/** Urlaubsmodus: away for me, or a pause for the whole household. */
import { ref, computed, watch } from 'vue';
import BottomSheet from '../ui/BottomSheet.vue';
import { useGame } from '../../composables/useGame';
import { useActiveMembers } from '../../composables/useHouseholdMembers';
import { toast } from '../../composables/useToast';
import { addDaysISO, parseLocalDate, todayLocalISO } from '../../utils/date';

const props = defineProps<{ open: boolean }>();
const emit = defineEmits<{ (e: 'close'): void }>();

const { status, me, setAway, setHouseholdPause } = useGame();
const { members } = useActiveMembers();

const today = todayLocalISO();
const max = addDaysISO(today, 90);
const scope = ref<'me' | 'all'>('me');
const until = ref(addDaysISO(today, 7));
const busy = ref(false);

watch(
  () => props.open,
  (o) => {
    if (!o) return;
    scope.value = members.value.length > 1 ? 'me' : 'all';
    until.value = addDaysISO(today, 7);
  },
);

const QUICK = [
  { label: 'Bis Sonntag', days: () => 7 - ((parseLocalDate(today).getDay() + 6) % 7) - 1 },
  { label: '1 Woche', days: () => 7 },
  { label: '2 Wochen', days: () => 14 },
];

const myAway = computed(() => me.value?.away_until ?? null);
const pausedUntil = computed(() => status.value?.paused_until ?? null);
const fmt = (iso: string) => parseLocalDate(iso).toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });
const valid = computed(() => !!until.value && until.value >= today && until.value <= max);

const save = async () => {
  if (!valid.value || busy.value) return;
  busy.value = true;
  const ok = scope.value === 'me' ? await setAway(until.value) : await setHouseholdPause(until.value);
  busy.value = false;
  if (ok) {
    toast.success(scope.value === 'me' ? `Gute Erholung! Weg bis ${fmt(until.value)}.` : `Haushalt pausiert bis ${fmt(until.value)}.`);
    emit('close');
  }
};

const endMine = async () => {
  if (await setAway(null)) toast.success('Willkommen zurück!');
};
const endPause = async () => {
  if (await setHouseholdPause(null)) toast.success('Pause beendet – die Balken laufen weiter.');
};
</script>

<template>
  <BottomSheet :open="open" title="Urlaub & Pause" @close="emit('close')">
    <div class="flex flex-col gap-5">
      <div v-if="myAway || pausedUntil" class="flex flex-col gap-2">
        <div v-if="myAway" class="surface p-3 flex items-center gap-3">
          <span class="text-2xl" aria-hidden="true">🏖️</span>
          <span class="flex-1 text-sm">Du bist weg bis <b>{{ fmt(myAway) }}</b>.</span>
          <button type="button" class="btn btn-sm btn-primary" @click="endMine">Bin zurück</button>
        </div>
        <div v-if="pausedUntil" class="surface p-3 flex items-center gap-3">
          <span class="text-2xl" aria-hidden="true">⏸️</span>
          <span class="flex-1 text-sm">Haushalt pausiert bis <b>{{ fmt(pausedUntil) }}</b>.</span>
          <button type="button" class="btn btn-sm btn-primary" @click="endPause">Beenden</button>
        </div>
      </div>

      <div v-if="members.length > 1" role="tablist" class="tabs tabs-box w-full grid grid-cols-2">
        <button type="button" role="tab" class="tab" :class="{ 'tab-active': scope === 'me' }" @click="scope = 'me'">Nur ich</button>
        <button type="button" role="tab" class="tab" :class="{ 'tab-active': scope === 'all' }" @click="scope = 'all'">Ganzer Haushalt</button>
      </div>

      <p class="text-sm text-base-content/70">
        <template v-if="scope === 'me'">
          Während du weg bist, übernehmen die anderen deine abwechselnden Aufgaben, und deine Serie ruht.
        </template>
        <template v-else>
          Keine Energie-Verluste, alle Serien ruhen, und die Woche wird nicht gewertet. Danach laufen die Frische-Balken dort weiter, wo sie standen.
        </template>
      </p>

      <div class="flex flex-col gap-2">
        <span class="text-sm font-semibold">Bis wann?</span>
        <div class="flex flex-wrap items-center gap-1.5">
          <button
            v-for="q in QUICK"
            :key="q.label"
            type="button"
            class="btn btn-sm rounded-full border-0"
            :class="until === addDaysISO(today, q.days()) ? 'btn-primary' : 'bg-base-200'"
            @click="until = addDaysISO(today, q.days())"
          >
            {{ q.label }}
          </button>
          <input v-model="until" type="date" :min="today" :max="max" class="input input-sm w-auto rounded-full" aria-label="Datum wählen" />
        </div>
      </div>
    </div>

    <template #footer>
      <button type="button" class="btn btn-primary min-w-28" :disabled="!valid || busy" @click="save">
        {{ scope === 'me' ? 'Ich bin weg' : 'Haushalt pausieren' }}
      </button>
    </template>
  </BottomSheet>
</template>
