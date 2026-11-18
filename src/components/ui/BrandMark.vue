<script setup lang="ts">
withDefaults(defineProps<{ size?: number }>(), { size: 48 });
</script>

<template>
  <!-- A stylised pantry jar: lid + rounded body with a shelf line. -->
  <svg :width="size" :height="size" viewBox="0 0 48 48" aria-hidden="true">
    <rect x="4" y="4" width="40" height="40" rx="12" class="fill-primary" />
    <rect x="15" y="11" width="18" height="5" rx="2" class="fill-secondary" />
    <path d="M14 19h20a2 2 0 0 1 2 2v13a4 4 0 0 1-4 4H16a4 4 0 0 1-4-4V21a2 2 0 0 1 2-2Z" class="fill-primary-content" />
    <path d="M17 27h14" stroke-width="2.5" stroke-linecap="round" class="stroke-primary" />
    <circle cx="20" cy="32" r="1.8" class="fill-accent" />
    <circle cx="26" cy="32" r="1.8" class="fill-secondary" />
  </svg>
</template>
