<script setup lang="ts">
/** Celebration after a completion crossed a level boundary. */
import { computed } from 'vue';
import BottomSheet from '../ui/BottomSheet.vue';
import { useGame } from '../../composables/useGame';
import { levelProgress, levelTitle } from '../../utils/game';

const { levelUp } = useGame();
const open = computed(() => !!levelUp.value);
const ev = computed(() => levelUp.value);
const progress = computed(() => levelProgress(ev.value?.xp_total ?? 0));
const newTitle = computed(() => {
  const e = ev.value;
  if (!e) return null;
  const before = levelTitle(e.level_before);
  const after = levelTitle(e.level_after);
  return before !== after ? after : null;
});
const close = () => (levelUp.value = null);
</script>

<template>
  <BottomSheet :open="open" size="sm" hide-close @close="close">
    <div v-if="ev" class="flex flex-col items-center text-center gap-2 py-4">
      <div class="trophy text-6xl" aria-hidden="true">🏆</div>
      <p class="text-xs font-bold uppercase tracking-widest text-primary mt-2">Level-Up!</p>
      <p class="font-display text-5xl font-bold tabular-nums">Level {{ ev.level_after }}</p>
      <p v-if="newTitle" class="text-base">Neuer Titel: <span class="font-semibold">{{ newTitle }}</span></p>
      <p v-else class="text-base-content/60">{{ levelTitle(ev.level_after) }}</p>
      <p class="mt-2 rounded-full bg-warning/15 px-3 py-1 font-semibold">+{{ ev.level_coins }} 🪙 Bonus</p>
      <p class="text-sm text-base-content/55 mt-1 tabular-nums">Noch {{ progress.span - progress.into }} XP bis Level {{ ev.level_after + 1 }}</p>
    </div>
    <template #footer>
      <button type="button" class="btn btn-primary w-full" @click="close">Weiter</button>
    </template>
  </BottomSheet>
</template>

<style scoped>
.trophy {
  animation: bounce 0.9s cubic-bezier(0.28, 0.84, 0.42, 1) both;
}
@keyframes bounce {
  0% { transform: scale(0.3) translateY(30px); opacity: 0; }
  60% { transform: scale(1.15) translateY(-6px); opacity: 1; }
  100% { transform: scale(1) translateY(0); }
}
@media (prefers-reduced-motion: reduce) {
  .trophy { animation: none; }
}
</style>
