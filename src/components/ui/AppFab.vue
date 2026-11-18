<script setup lang="ts">
/**
 * The page's primary floating action. Sits above the tab bar and the keyboard,
 * teleported so it never scrolls with content. Use one per page.
 */
defineProps<{ label: string; extended?: boolean }>();
defineEmits<{ (e: 'click'): void }>();
</script>

<template>
  <Teleport to="body">
    <Transition name="fab" appear>
      <button
        type="button"
        class="app-fab btn btn-primary shadow-lg shadow-primary/30 border-0 z-30"
        :class="extended ? 'rounded-full px-5 h-14 gap-2' : 'btn-circle w-14 h-14'"
        :aria-label="label"
        :title="label"
        @click="$emit('click')"
      >
        <slot />
        <span v-if="extended" class="font-semibold">{{ label }}</span>
      </button>
    </Transition>
  </Teleport>
</template>

<style scoped>
.app-fab {
  position: fixed;
  right: max(1rem, calc((100vw - 42rem) / 2 + 1rem));
  bottom: calc(var(--tabbar-h, 0px) + 1rem + var(--keyboard-inset, 0px));
}
.fab-enter-active,
.fab-leave-active {
  transition: transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.2s ease;
}
.fab-enter-from,
.fab-leave-to {
  transform: scale(0.6);
  opacity: 0;
}
</style>
