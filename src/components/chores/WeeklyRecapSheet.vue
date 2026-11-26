<script setup lang="ts">
/** Last week's recap, shown once per member at the start of a new week. */
import { computed } from 'vue';
import BottomSheet from '../ui/BottomSheet.vue';
import UserAvatar from '../ui/UserAvatar.vue';
import { useGame } from '../../composables/useGame';
import { useChores } from '../../composables/useChores';
import { useActiveMembers } from '../../composables/useHouseholdMembers';
import { useAuth } from '../../composables/useAuth';
import { questText } from '../../data/gameCatalog';
import { addDaysISO, parseLocalDate } from '../../utils/date';
import { CheckIcon, XMarkIcon } from '@heroicons/vue/24/solid';

const { status, markRecapSeen } = useGame();
const { areaById } = useChores();
const { memberById } = useActiveMembers();
const { user } = useAuth();

const recap = computed(() => status.value?.recap ?? null);
const open = computed(() => !!recap.value);

const range = computed(() => {
  const r = recap.value;
  if (!r) return '';
  const f = (iso: string) => parseLocalDate(iso).toLocaleDateString('de-DE', { day: 'numeric', month: 'numeric' });
  return `${f(r.week_start)} – ${f(addDaysISO(r.week_start, 6))}`;
});
const total = computed(() => recap.value?.members.reduce((s, m) => s + m.xp, 0) ?? 0);
const name = (id: string) => (id === user.value?.id ? 'Du' : memberById(id)?.display_name ?? 'Jemand');
/** Dative for „von …“. */
const byName = (id: string) => (id === user.value?.id ? 'dir' : memberById(id)?.display_name ?? 'jemandem');
const close = () => {
  if (recap.value) markRecapSeen(recap.value.week_start);
};
</script>

<template>
  <BottomSheet :open="open" title="Wochenrückblick" :subtitle="range" @close="close">
    <div v-if="recap" class="flex flex-col gap-5">
      <div class="flex flex-col items-center text-center gap-1 py-2">
        <div class="text-5xl" aria-hidden="true">{{ !recap.rated ? '🏖️' : recap.goal_reached ? '🏆' : '💪' }}</div>
        <p class="font-display text-2xl font-bold mt-1">
          <template v-if="!recap.rated">Pause-Woche</template>
          <template v-else-if="recap.goal_reached">Wochenziel geschafft!</template>
          <template v-else>Knapp daneben</template>
        </p>
        <p class="text-base-content/65 tabular-nums">
          {{ recap.team_xp }}<template v-if="recap.goal_xp"> / {{ recap.goal_xp }}</template> XP gemeinsam
          <template v-if="recap.goal_reached"> · +20 🪙 für alle, die mitgemacht haben</template>
        </p>
      </div>

      <section v-if="recap.members.length" class="surface p-4 flex flex-col gap-3">
        <div v-for="m in recap.members" :key="m.user_id" class="flex items-center gap-3">
          <UserAvatar :name="memberById(m.user_id)?.display_name ?? name(m.user_id)" :src="memberById(m.user_id)?.avatar_url" size="sm" />
          <div class="flex-1 min-w-0">
            <div class="flex items-baseline justify-between text-sm">
              <span class="font-semibold">{{ name(m.user_id) }}</span>
              <span class="tabular-nums text-base-content/60">{{ m.count }} Aufgaben · {{ m.xp }} XP</span>
            </div>
            <div class="mt-1 h-1.5 rounded-full bg-base-content/10 overflow-hidden">
              <span class="block h-full rounded-full bg-primary" :style="{ width: `${total ? (m.xp / total) * 100 : 0}%` }" />
            </div>
          </div>
        </div>
      </section>

      <section v-if="recap.highlights.top || recap.highlights.rescues" class="flex flex-col gap-2 text-sm">
        <p v-if="recap.highlights.top" class="flex items-center gap-2">
          <span aria-hidden="true">⭐</span>
          <span>Größte Tat: <b>{{ recap.highlights.top.title }}</b> von {{ byName(recap.highlights.top.user_id) }} (+{{ recap.highlights.top.xp }} XP)</span>
        </p>
        <p v-if="recap.highlights.rescues" class="flex items-center gap-2">
          <span aria-hidden="true">🦸</span>
          <span>{{ recap.highlights.rescues }} {{ recap.highlights.rescues === 1 ? 'Rettung' : 'Rettungen' }}</span>
        </p>
      </section>

      <section v-if="recap.quests.length">
        <p class="text-xs font-bold uppercase tracking-wider text-base-content/55 mb-2">Quests</p>
        <ul class="flex flex-col gap-1.5">
          <li v-for="q in recap.quests" :key="q.key" class="flex items-center gap-2 text-sm">
            <CheckIcon v-if="q.done" class="h-4 w-4 text-success shrink-0" />
            <XMarkIcon v-else class="h-4 w-4 text-base-content/35 shrink-0" />
            <span :class="q.done ? '' : 'text-base-content/55'">{{ questText(q.key, q.target, areaById(q.params.area_id)?.name).title }}</span>
            <span v-if="q.done" class="ml-auto text-xs font-semibold tabular-nums">+{{ q.reward }} 🪙</span>
          </li>
        </ul>
      </section>

      <p class="text-sm text-base-content/60 text-center">Die neuen Quests warten unter „Quests“. Auf eine gute Woche!</p>
    </div>
    <template #footer>
      <button type="button" class="btn btn-primary w-full" @click="close">Los geht's</button>
    </template>
  </BottomSheet>
</template>
