<script setup lang="ts">
/** Weekly goal, this week's quests, my streak and the badge grid. */
import { computed, ref } from 'vue';
import { useGame } from '../../composables/useGame';
import { useChores } from '../../composables/useChores';
import { BADGES, questText } from '../../data/gameCatalog';
import SectionHeader from '../ui/SectionHeader.vue';
import { CheckIcon } from '@heroicons/vue/24/solid';

const emit = defineEmits<{ (e: 'vacation'): void }>();

const { status, me, teamWeekXp, goalProgress, daysLeftInWeek } = useGame();
const { areaById } = useChores();

const goal = computed(() => status.value?.goal_xp ?? 0);
const quests = computed(() => status.value?.quests ?? []);
const doneQuests = computed(() => quests.value.filter((q) => q.completed_at).length);
const myBadges = computed(() => new Set((me.value?.badges ?? []).map((b) => b.key)));
const openBadge = ref<string | null>(null);

const R = 44;
const CIRC = 2 * Math.PI * R;
</script>

<template>
  <div class="flex flex-col gap-5">
    <section class="surface p-5 flex items-center gap-5">
      <div class="relative h-28 w-28 shrink-0">
        <svg viewBox="0 0 100 100" class="absolute inset-0 -rotate-90" aria-hidden="true">
          <circle cx="50" cy="50" :r="R" fill="none" stroke-width="8" class="stroke-base-content/10" />
          <circle
            cx="50"
            cy="50"
            :r="R"
            fill="none"
            stroke-width="8"
            stroke-linecap="round"
            class="transition-[stroke-dashoffset] duration-700"
            :class="status?.goal_failed ? 'stroke-error' : goalProgress >= 1 ? 'stroke-success' : 'stroke-primary'"
            :stroke-dasharray="CIRC"
            :stroke-dashoffset="CIRC * (1 - goalProgress)"
          />
        </svg>
        <div class="absolute inset-0 flex flex-col items-center justify-center">
          <span class="font-display text-2xl font-bold tabular-nums">{{ Math.round(goalProgress * 100) }} %</span>
        </div>
      </div>
      <div class="min-w-0">
        <p class="text-xs font-bold uppercase tracking-wider text-base-content/55">Wochenziel</p>
        <p class="font-display text-xl font-bold tabular-nums">{{ teamWeekXp }} / {{ goal }} XP</p>
        <p class="text-sm text-base-content/60">
          <template v-if="status?.goal_failed">Verfehlt – die Energie war leer.</template>
          <template v-else-if="goalProgress >= 1">Geschafft! Am Montag gibt es +20 🪙 für alle, die mitgemacht haben.</template>
          <template v-else>Noch {{ daysLeftInWeek }} {{ daysLeftInWeek === 1 ? 'Tag' : 'Tage' }}. Geschafft gibt es +20 🪙.</template>
        </p>
        <p v-if="status && status.goal_streak > 0" class="text-xs font-semibold text-warning mt-1">
          🏆 {{ status.goal_streak }} {{ status.goal_streak === 1 ? 'Woche' : 'Wochen' }} in Folge geschafft
        </p>
      </div>
    </section>

    <section>
      <SectionHeader title="Quests dieser Woche" :count="quests.length ? doneQuests : undefined">
        <span v-if="quests.length" class="text-xs text-base-content/50">von {{ quests.length }} geschafft</span>
      </SectionHeader>
      <div class="flex flex-col gap-2">
        <div
          v-for="q in quests"
          :key="q.id"
          class="surface p-4 flex items-start gap-3"
          :class="q.completed_at ? 'ring-1 ring-success/40' : ''"
        >
          <span class="h-10 w-10 shrink-0 rounded-2xl flex items-center justify-center text-xl" :class="q.completed_at ? 'bg-success/15' : 'bg-base-200'" aria-hidden="true">
            {{ questText(q.key, q.target, areaById(q.params.area_id)?.name).emoji }}
          </span>
          <div class="flex-1 min-w-0">
            <div class="flex items-baseline justify-between gap-2">
              <p class="font-semibold">{{ questText(q.key, q.target, areaById(q.params.area_id)?.name).title }}</p>
              <span class="text-xs font-bold tabular-nums shrink-0" :class="q.completed_at ? 'text-success' : 'text-base-content/60'">+{{ q.reward }} 🪙</span>
            </div>
            <p class="text-sm text-base-content/65">{{ questText(q.key, q.target, areaById(q.params.area_id)?.name).text }}</p>
            <div class="mt-2 flex items-center gap-2">
              <div class="flex-1 h-1.5 rounded-full bg-base-content/10 overflow-hidden">
                <span
                  class="block h-full rounded-full transition-[width] duration-700"
                  :class="q.completed_at ? 'bg-success' : 'bg-primary'"
                  :style="{ width: `${(q.progress / q.target) * 100}%` }"
                />
              </div>
              <span v-if="q.completed_at" class="text-success flex items-center gap-0.5 text-xs font-semibold">
                <CheckIcon class="h-3.5 w-3.5" /> Geschafft
              </span>
              <span v-else class="text-xs tabular-nums text-base-content/55">{{ q.progress }}/{{ q.target }}</span>
            </div>
          </div>
        </div>
        <p v-if="quests.length === 0" class="text-sm text-base-content/55 px-1">Ab Montag gibt es neue Quests.</p>
        <p class="text-xs text-base-content/45 px-1">Quest-Münzen bekommt jede Person im Haushalt.</p>
      </div>
    </section>

    <section v-if="me" class="surface p-4 flex items-center gap-4">
      <span class="text-3xl" aria-hidden="true">🔥</span>
      <div class="flex-1 min-w-0">
        <p class="font-semibold">{{ me.streak_current }} {{ me.streak_current === 1 ? 'Tag' : 'Tage' }} in Folge</p>
        <p class="text-xs text-base-content/60">
          Bestwert {{ me.streak_best }} ·
          <template v-if="me.joker_used">Joker dieser Woche verbraucht</template>
          <template v-else>1 Joker diese Woche frei 🃏</template>
        </p>
        <p class="text-[11px] text-base-content/45 mt-0.5">Ein verpasster Tag pro Woche reißt die Serie nicht ab. Im Urlaub ruht sie.</p>
      </div>
      <button type="button" class="btn btn-sm btn-ghost shrink-0" @click="emit('vacation')">🏖️ Urlaub</button>
    </section>

    <section>
      <SectionHeader title="Deine Abzeichen" :count="myBadges.size">
        <span class="text-xs text-base-content/50">von {{ BADGES.length }}</span>
      </SectionHeader>
      <div class="grid grid-cols-3 gap-2">
        <button
          v-for="[key, b] in BADGES"
          :key="key"
          type="button"
          class="surface p-3 flex flex-col items-center gap-1 text-center"
          :aria-label="`${b.title}: ${b.how}`"
          @click="openBadge = openBadge === key ? null : key"
        >
          <span class="text-3xl transition-all" :class="myBadges.has(key) ? '' : 'grayscale opacity-30'" aria-hidden="true">{{ b.emoji }}</span>
          <span class="text-[11px] font-semibold leading-tight" :class="myBadges.has(key) ? '' : 'text-base-content/45'">{{ b.title }}</span>
          <span v-if="openBadge === key" class="text-[10px] text-base-content/60 leading-snug">{{ b.how }}</span>
        </button>
      </div>
    </section>
  </div>
</template>
