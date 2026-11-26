<script setup lang="ts">
/** Head of the Aufgaben view: members with level ring, week XP, streak; fairness bar. */
import { computed } from 'vue';
import { useGame } from '../../composables/useGame';
import { useActiveMembers } from '../../composables/useHouseholdMembers';
import { useAuth } from '../../composables/useAuth';
import LevelAvatar from './LevelAvatar.vue';
import { levelProgress, levelTitle } from '../../utils/game';

const { status, weekShares, teamWeekXp, me } = useGame();
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
      isMe: m.user_id === user.value?.id,
    };
  }),
);

// Stable, theme-based colours for the fairness bar segments.
const TONES = ['bg-primary', 'bg-secondary', 'bg-accent', 'bg-info', 'bg-success'];
const toneOf = (userId: string) => TONES[Math.max(0, members.value.findIndex((m) => m.user_id === userId)) % TONES.length];
const nameOf = (userId: string) =>
  userId === user.value?.id ? 'Du' : members.value.find((m) => m.user_id === userId)?.display_name ?? '?';
</script>

<template>
  <section class="surface p-4 flex flex-col gap-4">
    <div class="flex items-start gap-4 overflow-x-auto -mx-1 px-1">
      <div v-for="r in rows" :key="r.user_id" class="flex items-center gap-3 min-w-0" :class="rows.length > 1 ? 'flex-1' : ''">
        <LevelAvatar :name="r.display_name" :src="r.avatar_url" :xp="r.xp" />
        <div class="min-w-0">
          <p class="font-semibold leading-tight truncate">{{ r.isMe ? 'Du' : r.display_name }}</p>
          <p class="text-xs text-base-content/55 truncate">{{ levelTitle(r.progress.level) }}</p>
          <p class="text-xs mt-0.5 flex items-center gap-2 tabular-nums">
            <span :title="`${r.progress.into} / ${r.progress.span} XP bis Level ${r.progress.level + 1}`">{{ r.week }} XP diese Woche</span>
            <span v-if="r.streak > 0" class="font-semibold text-warning" :title="`${r.streak} Tage in Folge`">🔥{{ r.streak }}</span>
          </p>
        </div>
      </div>
      <div v-if="me" class="ml-auto shrink-0 self-center rounded-full bg-warning/15 px-3 py-1 text-sm font-bold tabular-nums" title="Deine Münzen">
        🪙 {{ me.coins }}
      </div>
    </div>

    <div v-if="rows.length > 1">
      <div class="flex items-baseline justify-between text-xs mb-1.5">
        <span class="font-semibold">Diese Woche gemeinsam</span>
        <span class="tabular-nums text-base-content/60">{{ teamWeekXp }} XP</span>
      </div>
      <div class="h-2.5 w-full rounded-full bg-base-content/10 overflow-hidden flex" role="img" :aria-label="`Anteil diese Woche`">
        <span
          v-for="s in weekShares"
          :key="s.user_id"
          class="h-full transition-[width] duration-700"
          :class="toneOf(s.user_id)"
          :style="{ width: `${s.share * 100}%` }"
        />
      </div>
      <div class="flex flex-wrap gap-x-3 gap-y-1 mt-1.5 text-xs text-base-content/60">
        <span v-for="s in weekShares" :key="s.user_id" class="flex items-center gap-1">
          <span class="h-2 w-2 rounded-full" :class="toneOf(s.user_id)" />
          {{ nameOf(s.user_id) }} {{ teamWeekXp ? Math.round(s.share * 100) : 0 }} %
        </span>
      </div>
    </div>
  </section>
</template>
