<script setup lang="ts">
import { computed, type Component } from 'vue';

type Tone = 'neutral' | 'error' | 'warning' | 'success' | 'info' | 'accent' | 'primary';

const props = withDefaults(defineProps<{
  title?: string;
  icon?: Component;
  tone?: Tone;
  clickable?: boolean;
  loading?: boolean;
  muted?: boolean;
  align?: 'center' | 'start';
}>(), {
  tone: 'neutral',
  clickable: false,
  loading: false,
  muted: false,
  align: 'start',
});

const accentClass = computed(() => {
  switch (props.tone) {
    case 'error': return 'bg-error';
    case 'warning': return 'bg-warning';
    case 'success': return 'bg-success';
    case 'info': return 'bg-info';
    case 'accent': return 'bg-accent';
    case 'primary': return 'bg-primary';
    default: return 'bg-base-300';
  }
});

const iconColorClass = computed(() => {
  switch (props.tone) {
    case 'error': return 'text-error';
    case 'warning': return 'text-warning';
    case 'success': return 'text-success';
    case 'info': return 'text-info';
    case 'accent': return 'text-accent';
    case 'primary': return 'text-primary';
    default: return 'text-base-content/60';
  }
});
</script>

<template>
  <div
    class="relative overflow-hidden rounded-2xl bg-base-100 border border-base-300/60 shadow-sm transition-all h-full flex flex-col"
    :class="[
      clickable && !muted ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5' : '',
      muted ? 'opacity-50' : '',
    ]"
  >
    <span class="absolute inset-y-0 left-0 w-1" :class="accentClass" aria-hidden="true" />

    <div class="flex-1 flex flex-col p-4 pl-5" :class="align === 'center' ? 'items-center text-center' : ''">
      <div v-if="title || icon" class="flex items-center gap-2 mb-2 w-full" :class="align === 'center' ? 'justify-center' : ''">
        <component :is="icon" v-if="icon" class="h-5 w-5 shrink-0" :class="iconColorClass" />
        <h3 v-if="title" class="text-xs uppercase tracking-wider font-semibold text-base-content/60 truncate">{{ title }}</h3>
      </div>

      <div v-if="loading" class="flex-1 flex items-center justify-center">
        <span class="loading loading-spinner loading-md text-base-content/40" />
      </div>
      <div v-else class="flex-1 flex flex-col w-full" :class="align === 'center' ? 'items-center justify-center' : ''">
        <slot />
      </div>
    </div>
  </div>
</template>
