<script setup lang="ts">
/** Floating "+24 XP · +5 🪙" with a little confetti after each completion. */
import { ref, watch } from 'vue';
import { useGame, type RewardEvent } from '../../composables/useGame';
import { FLAG_LABEL, type RewardFlag } from '../../utils/game';

const { lastReward } = useGame();
const shown = ref<RewardEvent[]>([]);

const SHOW_FLAGS: RewardFlag[] = ['rescue', 'on_time', 'unpopular', 'early'];
const CONFETTI = ['bg-primary', 'bg-secondary', 'bg-accent', 'bg-warning', 'bg-success', 'bg-info'];

const pieces = Array.from({ length: 14 }, (_, i) => ({
  tone: CONFETTI[i % CONFETTI.length],
  x: Math.round(Math.cos((i / 14) * Math.PI * 2) * (60 + (i % 3) * 18)),
  y: Math.round(Math.sin((i / 14) * Math.PI * 2) * (40 + (i % 4) * 12)) - 30,
  r: (i * 47) % 360,
}));

watch(lastReward, (ev) => {
  if (!ev) return;
  shown.value = [...shown.value, ev];
  setTimeout(() => (shown.value = shown.value.filter((e) => e.id !== ev.id)), 1800);
});
</script>

<template>
  <Teleport to="body">
    <div class="burst-layer fixed inset-x-0 z-50 pointer-events-none flex justify-center" aria-live="polite">
      <div v-for="ev in shown" :key="ev.id" class="burst absolute flex flex-col items-center">
        <span
          v-for="(p, i) in pieces"
          :key="i"
          class="piece absolute h-2 w-1.5 rounded-sm"
          :class="p.tone"
          :style="{ '--x': `${p.x}px`, '--y': `${p.y}px`, '--r': `${p.r}deg` }"
        />
        <span class="relative z-10 rounded-full bg-base-100 shadow-lg shadow-base-content/15 border border-base-300 px-4 py-2 font-display text-lg font-bold tabular-nums whitespace-nowrap">
          <span class="text-primary">+{{ ev.xp }} XP</span>
          <span class="text-base-content/40 mx-1">·</span>
          <span>+{{ ev.coins }} 🪙</span>
        </span>
        <span v-if="ev.flags.some((f) => SHOW_FLAGS.includes(f))" class="relative z-10 mt-1 text-xs font-semibold text-base-content/70 bg-base-100/90 rounded-full px-2 py-0.5">
          {{ ev.flags.filter((f) => SHOW_FLAGS.includes(f)).map((f) => FLAG_LABEL[f]).join(' · ') }}
        </span>
        <span v-if="ev.streak > 1" class="relative z-10 mt-1 text-xs font-semibold text-warning bg-base-100/90 rounded-full px-2 py-0.5">🔥 {{ ev.streak }} Tage in Folge</span>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.burst-layer {
  top: 38%;
}
.burst {
  animation: rise 1.8s ease-out forwards;
}
.piece {
  left: 50%;
  top: 50%;
  opacity: 0;
  animation: fly 0.9s ease-out forwards;
}
@keyframes rise {
  0% { transform: translateY(20px) scale(0.8); opacity: 0; }
  15% { transform: translateY(0) scale(1.05); opacity: 1; }
  25% { transform: translateY(0) scale(1); }
  75% { opacity: 1; }
  100% { transform: translateY(-60px); opacity: 0; }
}
@keyframes fly {
  0% { transform: translate(0, 0) rotate(0); opacity: 1; }
  100% { transform: translate(var(--x), var(--y)) rotate(var(--r)); opacity: 0; }
}
@media (prefers-reduced-motion: reduce) {
  .burst { animation-duration: 1.8s; animation-name: fade; }
  .piece { display: none; }
  @keyframes fade { 0%, 80% { opacity: 1; } 100% { opacity: 0; } }
}
</style>
