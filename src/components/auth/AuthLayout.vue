<script setup lang="ts">
import BrandMark from '../ui/BrandMark.vue';
defineProps<{ title: string; subtitle?: string }>();
</script>

<template>
  <div class="auth-wrap min-h-dvh flex flex-col items-center justify-center px-4 py-10">
    <div class="w-full max-w-sm flex flex-col gap-6">
      <div class="flex flex-col items-center text-center gap-3">
        <BrandMark :size="56" />
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Mein Magaziner</p>
          <h1 class="font-display text-3xl mt-1">{{ title }}</h1>
          <p v-if="subtitle" class="text-sm text-base-content/60 mt-1.5">{{ subtitle }}</p>
        </div>
      </div>
      <slot name="before" />
      <div class="surface p-6 flex flex-col gap-4">
        <slot />
      </div>
      <slot name="after" />
    </div>
  </div>
</template>

<style scoped>
.auth-wrap {
  background:
    radial-gradient(60rem 30rem at 50% -10%, color-mix(in oklab, var(--color-primary) 14%, transparent), transparent 70%),
    var(--color-base-200);
  padding-top: max(2.5rem, env(safe-area-inset-top));
}
</style>
