<script setup lang="ts">
/** „Heute dran“: chores due for me (or nobody), tickable right here. */
import { computed } from 'vue';
import { useChores, type Chore } from '../../composables/useChores';
import { useGame } from '../../composables/useGame';
import { useAuth } from '../../composables/useAuth';
import { CheckCircleIcon, CheckIcon } from '@heroicons/vue/24/outline';
import { freshness, xpPreview, FRESHNESS_TONE } from '../../utils/game';
import WidgetShell from './WidgetShell.vue';

const { dueForMe, complete, completing, loaded, loading } = useChores();
const { me } = useGame();
const { user } = useAuth();

const sorted = computed(() =>
  [...dueForMe.value].sort((a, b) => (freshness(b)?.ratio ?? 0) - (freshness(a)?.ratio ?? 0)),
);
const next = computed(() => sorted.value.slice(0, 3));
const xpOpen = computed(() => dueForMe.value.reduce((s, c) => s + xpPreview(c, user.value?.id).xp, 0));

const tick = (c: Chore) => {
  navigator.vibrate?.(10);
  complete(c);
};
</script>

<template>
  <WidgetShell title="Heute dran" :icon="CheckCircleIcon" tone="success" clickable :loading="!loaded && loading">
    <template v-if="dueForMe.length > 0">
      <div class="flex items-baseline gap-1.5">
        <span class="font-display text-4xl tabular-nums leading-none">{{ dueForMe.length }}</span>
        <span class="text-xs text-base-content/55">fällig</span>
        <span class="ml-auto text-xs font-semibold text-primary tabular-nums">+{{ xpOpen }} XP</span>
      </div>
      <ul class="mt-3 flex flex-col gap-1.5">
        <li v-for="c in next" :key="c.id" class="flex items-center gap-2 text-sm min-w-0">
          <button
            type="button"
            class="h-6 w-6 -my-0.5 shrink-0 rounded-full border-2 flex items-center justify-center"
            :class="completing.has(c.id) ? 'bg-success border-success text-success-content' : 'border-base-content/30'"
            :aria-label="`${c.title} erledigen`"
            @click.stop="tick(c)"
          >
            <CheckIcon v-if="completing.has(c.id)" class="h-3.5 w-3.5 stroke-[3]" />
          </button>
          <span class="h-1.5 w-1.5 rounded-full shrink-0" :class="FRESHNESS_TONE[freshness(c)?.state ?? 'today']" />
          <span class="truncate">{{ c.title }}</span>
        </li>
      </ul>
    </template>
    <div v-else class="mt-auto text-sm text-base-content/50">
      Alles frisch 🌿
      <span v-if="me && me.streak_current > 0" class="block mt-1 text-warning font-semibold">🔥 {{ me.streak_current }} Tage in Folge</span>
    </div>
  </WidgetShell>
</template>
