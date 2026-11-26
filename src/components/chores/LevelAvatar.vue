<script setup lang="ts">
/** Avatar with a level-progress ring and a level chip. */
import { computed } from 'vue';
import UserAvatar from '../ui/UserAvatar.vue';
import { levelProgress } from '../../utils/game';

const props = withDefaults(
  defineProps<{ name?: string | null; src?: string | null; xp: number; size?: 'md' | 'lg' }>(),
  { size: 'md' },
);

const p = computed(() => levelProgress(props.xp));
const dim = computed(() => (props.size === 'lg' ? 76 : 52));
const r = computed(() => dim.value / 2 - 2.5);
const circ = computed(() => 2 * Math.PI * r.value);
</script>

<template>
  <div class="relative shrink-0" :style="{ width: `${dim}px`, height: `${dim}px` }">
    <svg :width="dim" :height="dim" class="absolute inset-0 -rotate-90" aria-hidden="true">
      <circle :cx="dim / 2" :cy="dim / 2" :r="r" fill="none" stroke-width="3" class="stroke-base-content/10" />
      <circle
        :cx="dim / 2"
        :cy="dim / 2"
        :r="r"
        fill="none"
        stroke-width="3"
        stroke-linecap="round"
        class="stroke-primary transition-[stroke-dashoffset] duration-700"
        :stroke-dasharray="circ"
        :stroke-dashoffset="circ * (1 - p.pct)"
      />
    </svg>
    <div class="absolute inset-[5px] flex items-center justify-center">
      <UserAvatar :name="name" :src="src" :size="size === 'lg' ? 'lg' : 'md'" />
    </div>
    <span
      class="absolute -bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-primary text-primary-content font-bold tabular-nums leading-none px-1.5 py-0.5 shadow-sm"
      :class="size === 'lg' ? 'text-xs' : 'text-[10px]'"
      :aria-label="`Level ${p.level}`"
    >
      Lv {{ p.level }}
    </span>
  </div>
</template>
