<script setup lang="ts">
/**
 * +/− quantity control with 40px tap targets. Emits `dec` / `inc` instead of
 * mutating, so callers decide what "0" means (e.g. „aufgebraucht“ with undo).
 */
import { MinusIcon, PlusIcon } from '@heroicons/vue/24/outline';

withDefaults(defineProps<{ value: number; min?: number; size?: 'sm' | 'md' }>(), { min: 0, size: 'md' });
defineEmits<{ (e: 'dec'): void; (e: 'inc'): void }>();
</script>

<template>
  <div class="inline-flex items-center rounded-full bg-base-200 p-0.5 select-none">
    <button
      type="button"
      class="btn btn-ghost btn-circle"
      :class="size === 'sm' ? 'btn-sm' : ''"
      aria-label="Weniger"
      @click.stop="$emit('dec')"
    >
      <MinusIcon class="h-4 w-4" />
    </button>
    <span class="min-w-7 text-center font-bold tabular-nums" :class="size === 'sm' ? 'text-sm' : ''">{{ value }}</span>
    <button
      type="button"
      class="btn btn-ghost btn-circle"
      :class="size === 'sm' ? 'btn-sm' : ''"
      aria-label="Mehr"
      @click.stop="$emit('inc')"
    >
      <PlusIcon class="h-4 w-4" />
    </button>
  </div>
</template>
