<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{ name?: string | null; src?: string | null; size?: 'xs' | 'sm' | 'md' | 'lg' }>(),
  { size: 'md' },
);

const initial = computed(() => (props.name?.trim()?.[0] ?? '?').toUpperCase());

// Stable pastel per name so members are recognisable at a glance.
const hue = computed(() => {
  const n = props.name ?? '';
  let h = 0;
  for (let i = 0; i < n.length; i++) h = (h * 31 + n.charCodeAt(i)) % 360;
  return h;
});

const sizeClass = computed(
  () => ({ xs: 'h-5 w-5 text-[10px]', sm: 'h-8 w-8 text-sm', md: 'h-10 w-10 text-base', lg: 'h-16 w-16 text-2xl' })[props.size],
);
</script>

<template>
  <img
    v-if="src"
    :src="src"
    :alt="name ?? 'Profil'"
    class="rounded-full object-cover shrink-0 bg-base-300"
    :class="sizeClass"
  />
  <span
    v-else
    class="rounded-full shrink-0 inline-flex items-center justify-center font-bold select-none"
    :class="sizeClass"
    :style="{ backgroundColor: `oklch(85% 0.07 ${hue})`, color: `oklch(32% 0.08 ${hue})` }"
    :aria-label="name ?? undefined"
  >
    {{ initial }}
  </span>
</template>
