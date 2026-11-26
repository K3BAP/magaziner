<script setup lang="ts">
/** Team energy, weekly goal and every member's level/streak at a glance. */
import { computed } from 'vue';
import { useGame } from '../../composables/useGame';
import { useActiveMembers } from '../../composables/useHouseholdMembers';
import { useAuth } from '../../composables/useAuth';
import { TrophyIcon } from '@heroicons/vue/24/outline';
import { energyMood } from '../../data/gameCatalog';
import LevelAvatar from '../chores/LevelAvatar.vue';
import WidgetShell from './WidgetShell.vue';

const { status, teamWeekXp, goalProgress, daysLeftInWeek, loading } = useGame();
const { members } = useActiveMembers();
const { user } = useAuth();

const mood = computed(() => energyMood(status.value?.energy ?? 80));
const rows = computed(() =>
  members.value.map((m) => {
    const g = status.value?.members.find((x) => x.user_id === m.user_id);
    return { ...m, xp: g?.xp_total ?? 0, streak: g?.streak_current ?? 0, coins: g?.coins ?? 0, isMe: m.user_id === user.value?.id };
  }),
);
</script>

<template>
  <WidgetShell title="Team" :icon="TrophyIcon" tone="primary" clickable :loading="!status && loading">
    <div v-if="status" class="flex flex-col gap-3">
      <div class="flex items-center gap-3 overflow-x-auto">
        <div v-for="r in rows" :key="r.user_id" class="flex items-center gap-2 min-w-0 shrink-0">
          <LevelAvatar :name="r.display_name" :src="r.avatar_url" :xp="r.xp" />
          <div class="text-xs leading-tight">
            <p class="font-semibold text-sm truncate max-w-24">{{ r.isMe ? 'Du' : r.display_name }}</p>
            <p class="tabular-nums text-base-content/60 flex gap-2">
              <span v-if="r.streak" class="text-warning font-semibold">🔥{{ r.streak }}</span>
              <span>🪙 {{ r.coins }}</span>
            </p>
          </div>
        </div>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <p class="text-xs text-base-content/60 mb-1">{{ mood.emoji }} Energie {{ status.energy }}</p>
          <div class="h-2 rounded-full bg-base-content/10 overflow-hidden">
            <span class="block h-full rounded-full" :class="mood.tone" :style="{ width: `${status.energy}%` }" />
          </div>
        </div>
        <div>
          <p class="text-xs text-base-content/60 mb-1 tabular-nums">🎯 {{ teamWeekXp }}/{{ status.goal_xp }} · {{ daysLeftInWeek }} T.</p>
          <div class="h-2 rounded-full bg-base-content/10 overflow-hidden">
            <span
              class="block h-full rounded-full"
              :class="status.goal_failed ? 'bg-error' : goalProgress >= 1 ? 'bg-success' : 'bg-primary'"
              :style="{ width: `${goalProgress * 100}%` }"
            />
          </div>
        </div>
      </div>
    </div>
  </WidgetShell>
</template>
