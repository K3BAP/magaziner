<script setup lang="ts">
import { computed, type Component } from 'vue';

type Tone = 'neutral' | 'error' | 'warning' | 'success' | 'info' | 'accent' | 'primary';

const props = withDefaults(
  defineProps<{
    title?: string;
    icon?: Component;
    tone?: Tone;
    clickable?: boolean;
    loading?: boolean;
    muted?: boolean;
    align?: 'center' | 'start';
  }>(),
  { tone: 'neutral', clickable: false, loading: false, muted: false, align: 'start' },
);

const chip = computed(
  () =>
    ({
      error: 'bg-error/12 text-error',
      warning: 'bg-warning/18 text-warning',
      success: 'bg-success/12 text-success',
      info: 'bg-info/12 text-info',
      accent: 'bg-accent/12 text-accent',
      primary: 'bg-primary/12 text-primary',
      neutral: 'bg-base-200 text-base-content/60',
    })[props.tone],
);
</script>

<template>
  <div
    class="surface h-full flex flex-col p-4 transition-transform"
    :class="[clickable ? 'pressable cursor-pointer' : '', muted ? 'opacity-70' : '']"
  >
    <div v-if="title || icon" class="flex items-center gap-2 mb-3 min-w-0">
      <span v-if="icon" class="h-7 w-7 rounded-xl flex items-center justify-center shrink-0" :class="chip">
        <component :is="icon" class="h-4 w-4" />
      </span>
      <h3 v-if="title" class="text-[13px] font-semibold text-base-content/70 leading-tight line-clamp-2">{{ title }}</h3>
      <div class="flex-1" />
      <slot name="action" />
    </div>

    <div v-if="loading" class="flex-1 flex flex-col gap-2 justify-center">
      <div class="skeleton h-6 w-1/2 rounded-full" />
      <div class="skeleton h-3 w-3/4 rounded-full" />
    </div>
    <div v-else class="flex-1 flex flex-col w-full" :class="align === 'center' ? 'items-center justify-center text-center' : ''">
      <slot />
    </div>
  </div>
</template>
