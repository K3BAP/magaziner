<script setup lang="ts">
/**
 * Head of the Aufgaben view: members (level ring, week XP, streak), team
 * energy and the weekly goal. The goal bar is split by member colour, so it
 * doubles as the fairness bar.
 */
import { computed } from 'vue';
import { useGame } from '../../composables/useGame';
import { useActiveMembers } from '../../composables/useHouseholdMembers';
import { useAuth } from '../../composables/useAuth';
import LevelAvatar from './LevelAvatar.vue';
import { levelProgress, levelTitle } from '../../utils/game';
import { energyMood } from '../../data/gameCatalog';
import { parseLocalDate } from '../../utils/date';

const emit = defineEmits<{ (e: 'vacation'): void }>();

const { status, teamWeekXp, me, daysLeftInWeek } = useGame();
const { members } = useActiveMembers();
const { user } = useAuth();

const rows = computed(() =>
  members.value.map((m) => {
    const g = status.value?.members.find((x) => x.user_id === m.user_id);
    const xp = g?.xp_total ?? 0;
    return {
      ...m,
      xp,
      progress: levelProgress(xp),
      week: g?.xp_week ?? 0,
      streak: g?.streak_current ?? 0,
      away: g?.away_until ?? null,
      isMe: m.user_id === user.value?.id,
    };
  }),
);

// Stable, theme-based colours for member segments.
const TONES = ['bg-primary', 'bg-secondary', 'bg-accent', 'bg-info', 'bg-success'];
const toneOf = (userId: string) => TONES[Math.max(0, members.value.findIndex((m) => m.user_id === userId)) % TONES.length];

const energy = computed(() => status.value?.energy ?? 80);
const mood = computed(() => energyMood(energy.value));
const goal = computed(() => status.value?.goal_xp ?? 0);
const reached = computed(() => goal.value > 0 && teamWeekXp.value >= goal.value);
const scale = computed(() => Math.max(goal.value, teamWeekXp.value, 1));
const segments = computed(() =>
  rows.value.map((r) => ({ id: r.user_id, name: r.isMe ? 'Du' : r.display_name, xp: r.week, pct: (r.week / scale.value) * 100 })),
);
const multi = computed(() => rows.value.length > 1);

const shortDate = (iso: string) => parseLocalDate(iso).toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'numeric' });
</script>

<template>
  <section class="surface p-4 flex flex-col gap-4">
    <button
      v-if="status?.paused_until"
      type="button"
      class="-mx-1 -mt-1 rounded-2xl bg-info/12 px-3 py-2 text-sm text-left flex items-center gap-2"
      @click="emit('vacation')"
    >
      <span aria-hidden="true">🏖️</span>
      <span class="flex-1">Pause bis {{ shortDate(status.paused_until) }} – keine Energie-Verluste, Streaks ruhen.</span>
    </button>

    <div class="flex items-start gap-4 overflow-x-auto -mx-1 px-1">
      <div v-for="r in rows" :key="r.user_id" class="flex items-center gap-3 min-w-0" :class="multi ? 'flex-1' : ''">
        <LevelAvatar :name="r.display_name" :src="r.avatar_url" :xp="r.xp" />
        <div class="min-w-0">
          <p class="font-semibold leading-tight truncate">{{ r.isMe ? 'Du' : r.display_name }}</p>
          <p class="text-xs text-base-content/55 truncate">
            <template v-if="r.away">🏖️ weg bis {{ shortDate(r.away) }}</template>
            <template v-else>{{ levelTitle(r.progress.level) }}</template>
          </p>
          <p class="text-xs mt-0.5 flex items-center gap-2 tabular-nums">
            <span :title="`${r.progress.into} / ${r.progress.span} XP bis Level ${r.progress.level + 1}`">{{ r.week }} XP</span>
            <span v-if="r.streak > 0" class="font-semibold text-warning" :title="`${r.streak} Tage in Folge`">🔥{{ r.streak }}</span>
          </p>
        </div>
      </div>
      <div v-if="me" class="ml-auto shrink-0 self-center rounded-full bg-warning/15 px-3 py-1 text-sm font-bold tabular-nums" title="Deine Münzen">
        🪙 {{ me.coins }}
      </div>
    </div>

    <div class="flex items-center gap-3">
      <span class="text-2xl leading-none" aria-hidden="true" :title="mood.label">{{ mood.emoji }}</span>
      <div class="flex-1 min-w-0">
        <div class="flex items-baseline justify-between text-xs mb-1">
          <span class="font-semibold">Team-Energie · {{ mood.label }}</span>
          <span class="tabular-nums text-base-content/60">{{ energy }} / 100</span>
        </div>
        <div class="h-2 rounded-full bg-base-content/10 overflow-hidden" role="progressbar" :aria-valuenow="energy" aria-valuemin="0" aria-valuemax="100" aria-label="Team-Energie">
          <span class="block h-full rounded-full transition-[width] duration-700" :class="mood.tone" :style="{ width: `${energy}%` }" />
        </div>
        <p class="text-[11px] text-base-content/50 mt-1">{{ mood.hint }}</p>
      </div>
    </div>

    <div v-if="goal">
      <div class="flex items-baseline justify-between text-xs mb-1.5">
        <span class="font-semibold">
          Wochenziel
          <span v-if="status?.goal_failed" class="text-error"> · verfehlt</span>
          <span v-else-if="reached" class="text-success"> · geschafft! 🎉</span>
        </span>
        <span class="tabular-nums text-base-content/60">
          {{ teamWeekXp }} / {{ goal }} XP · noch {{ daysLeftInWeek }} {{ daysLeftInWeek === 1 ? 'Tag' : 'Tage' }}
        </span>
      </div>
      <div class="relative h-2.5 w-full rounded-full bg-base-content/10 overflow-hidden flex" role="progressbar" :aria-valuenow="teamWeekXp" :aria-valuemax="goal" aria-label="Wochenziel">
        <span
          v-for="s in segments"
          :key="s.id"
          class="h-full transition-[width] duration-700"
          :class="multi ? toneOf(s.id) : 'bg-primary'"
          :style="{ width: `${s.pct}%` }"
        />
      </div>
      <div v-if="multi" class="flex flex-wrap gap-x-3 gap-y-1 mt-1.5 text-xs text-base-content/60">
        <span v-for="s in segments" :key="s.id" class="flex items-center gap-1 tabular-nums">
          <span class="h-2 w-2 rounded-full" :class="toneOf(s.id)" />
          {{ s.name }} {{ teamWeekXp ? Math.round((s.xp / teamWeekXp) * 100) : 0 }} %
        </span>
      </div>
      <p v-else-if="status?.goal_failed" class="text-[11px] text-base-content/50 mt-1">Die Energie war leer – nächste Woche klappt's.</p>
      <p v-else-if="reached" class="text-[11px] text-base-content/50 mt-1">Am Montag gibt es +20 🪙.</p>
    </div>
  </section>
</template>
