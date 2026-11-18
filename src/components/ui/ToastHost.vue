<script setup lang="ts">
import { useToast } from '../../composables/useToast';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XCircleIcon,
} from '@heroicons/vue/24/solid';

const { toasts, dismiss, runAction } = useToast();

const icons = {
  success: CheckCircleIcon,
  error: XCircleIcon,
  warning: ExclamationTriangleIcon,
  info: InformationCircleIcon,
} as const;

const iconClass = {
  success: 'text-success',
  error: 'text-error',
  warning: 'text-warning',
  info: 'text-info',
} as const;
</script>

<template>
  <Teleport to="body">
    <div
      class="toast-stack fixed inset-x-0 z-[80] flex flex-col items-center gap-2 px-4 pointer-events-none"
      aria-live="polite"
      role="status"
    >
      <TransitionGroup name="toast">
        <div
          v-for="t in toasts"
          :key="t.id"
          class="pointer-events-auto w-full max-w-md flex items-center gap-3 rounded-2xl bg-neutral text-neutral-content shadow-xl pl-4 pr-2 py-2.5 min-h-12"
          @click="!t.action && dismiss(t.id)"
        >
          <component :is="icons[t.kind]" class="h-5 w-5 shrink-0" :class="iconClass[t.kind]" />
          <span class="flex-1 text-sm leading-snug">{{ t.message }}</span>
          <button
            v-if="t.action"
            type="button"
            class="btn btn-sm btn-ghost text-primary-content/90 font-semibold uppercase tracking-wide"
            @click.stop="runAction(t)"
          >
            {{ t.action.label }}
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
/* Sits above the bottom tab bar (its height is published as --tabbar-h). */
.toast-stack {
  bottom: calc(var(--tabbar-h, 0px) + var(--keyboard-inset, 0px) + 0.75rem + env(safe-area-inset-bottom));
}
.toast-enter-active,
.toast-leave-active {
  transition: transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.2s ease;
}
.toast-enter-from {
  transform: translateY(1rem) scale(0.96);
  opacity: 0;
}
.toast-leave-to {
  opacity: 0;
  transform: scale(0.96);
}
.toast-leave-active {
  position: absolute;
}
</style>
