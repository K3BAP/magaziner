<script setup lang="ts">
/**
 * The one modal primitive of the app. Bottom sheet on phones, centred card on
 * wider screens. Teleported to <body> so no ancestor `overflow-hidden` or
 * transform can clip it.
 *
 * - `v-model:open` (or `:open` + `@close`)
 * - Escape, backdrop tap and a downward swipe on the grab handle close it
 * - Lifts above the on-screen keyboard via `--keyboard-inset`
 * - Locks page scroll while open, restores focus on close
 *
 * Slots: default (body), `footer` (sticky action row), `header` (replaces title).
 */
import { ref, watch, nextTick, onBeforeUnmount, computed, useId } from 'vue';
import { XMarkIcon } from '@heroicons/vue/24/outline';

const props = withDefaults(
  defineProps<{
    open: boolean;
    title?: string;
    subtitle?: string;
    /** Hide the close (×) button in the header. */
    hideClose?: boolean;
    /** Prevent closing via backdrop / Escape / swipe (e.g. while saving). */
    persistent?: boolean;
    /** Max width on desktop. */
    size?: 'sm' | 'md' | 'lg';
    /** Remove body padding (for full-bleed lists). */
    flush?: boolean;
  }>(),
  { size: 'md' },
);

const emit = defineEmits<{ (e: 'update:open', v: boolean): void; (e: 'close'): void }>();

const panel = ref<HTMLElement | null>(null);
const titleId = useId();
let lastFocused: HTMLElement | null = null;

const close = () => {
  if (props.persistent) return;
  emit('update:open', false);
  emit('close');
};

// --- Scroll lock (ref-counted so stacked sheets behave) ---
let lockCount = 0;
const lockScroll = (on: boolean) => {
  const w = window as any;
  w.__sheetLocks = (w.__sheetLocks ?? 0) + (on ? 1 : -1);
  document.documentElement.style.overflow = w.__sheetLocks > 0 ? 'hidden' : '';
};

watch(
  () => props.open,
  async (open) => {
    if (open) {
      lastFocused = document.activeElement as HTMLElement | null;
      lockScroll(true);
      lockCount++;
      await nextTick();
      // Focus the first field if there is one, else the panel itself — but
      // never auto-open the keyboard for sheets that are only lists/actions.
      const field = panel.value?.querySelector<HTMLElement>('[autofocus]');
      (field ?? panel.value)?.focus({ preventScroll: true });
    } else if (lockCount > 0) {
      lockScroll(false);
      lockCount--;
      lastFocused?.focus?.({ preventScroll: true });
    }
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  while (lockCount > 0) {
    lockScroll(false);
    lockCount--;
  }
});

const onKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    e.stopPropagation();
    close();
  }
};

// --- Swipe-to-close on the handle / header ---
const dragY = ref(0);
let startY: number | null = null;
const onPointerDown = (e: PointerEvent) => {
  if (props.persistent) return;
  if ((e.target as HTMLElement).closest('input, textarea, select, button, a')) return;
  startY = e.clientY;
  (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
};
const onPointerMove = (e: PointerEvent) => {
  if (startY === null) return;
  dragY.value = Math.max(0, e.clientY - startY);
};
const onPointerUp = () => {
  if (startY === null) return;
  const shouldClose = dragY.value > 90;
  startY = null;
  dragY.value = 0;
  if (shouldClose) close();
};

const panelStyle = computed(() =>
  dragY.value ? { transform: `translateY(${dragY.value}px)`, transition: 'none' } : undefined,
);

const sizeClass = computed(
  () => ({ sm: 'sm:max-w-sm', md: 'sm:max-w-md', lg: 'sm:max-w-lg' })[props.size],
);
</script>

<template>
  <Teleport to="body">
    <Transition name="sheet-fade">
      <div
        v-if="open"
        class="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-[2px]"
        @click.self="close"
        @keydown="onKeydown"
      >
          <div
            ref="panel"
            role="dialog"
            aria-modal="true"
            :aria-labelledby="title ? titleId : undefined"
            tabindex="-1"
            class="sheet-panel relative w-full bg-base-100 text-base-content shadow-2xl outline-none flex flex-col rounded-t-3xl sm:rounded-3xl sm:mb-0"
            :class="sizeClass"
            :style="panelStyle"
          >
            <!-- Grab handle (phones) -->
            <div
              class="sm:hidden pt-2.5 pb-1 flex justify-center touch-none cursor-grab"
              @pointerdown="onPointerDown"
              @pointermove="onPointerMove"
              @pointerup="onPointerUp"
              @pointercancel="onPointerUp"
            >
              <div class="h-1.5 w-10 rounded-full bg-base-content/20" />
            </div>

            <div
              v-if="title || $slots.header || !hideClose"
              class="flex items-start gap-3 px-5 pt-2 sm:pt-5 pb-3 touch-none"
              @pointerdown="onPointerDown"
              @pointermove="onPointerMove"
              @pointerup="onPointerUp"
              @pointercancel="onPointerUp"
            >
              <div class="flex-1 min-w-0">
                <slot name="header">
                  <h3 v-if="title" :id="titleId" class="font-display font-bold text-lg leading-tight">
                    {{ title }}
                  </h3>
                  <p v-if="subtitle" class="text-sm text-base-content/60 truncate mt-0.5">{{ subtitle }}</p>
                </slot>
              </div>
              <button
                v-if="!hideClose"
                type="button"
                class="btn btn-ghost btn-sm btn-circle -mr-2 -mt-1"
                aria-label="Schließen"
                @pointerdown.stop
                @click="close"
              >
                <XMarkIcon class="h-5 w-5" />
              </button>
            </div>

            <div class="flex-1 overflow-y-auto overscroll-contain" :class="flush ? '' : 'px-5 pb-4'">
              <slot />
            </div>

            <div
              v-if="$slots.footer"
              class="px-5 pt-3 border-t border-base-200 flex gap-2 justify-end sheet-footer"
            >
              <slot name="footer" />
            </div>
            <div v-else class="sheet-safe" />
          </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.sheet-panel {
  max-height: calc(100dvh - var(--keyboard-inset, 0px) - 1.5rem - env(safe-area-inset-top));
  margin-bottom: var(--keyboard-inset, 0px);
  transition: transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1), margin-bottom 0.15s ease;
}
.sheet-footer {
  padding-bottom: max(0.75rem, env(safe-area-inset-bottom));
}
.sheet-safe {
  height: env(safe-area-inset-bottom);
}
@media (min-width: 640px) {
  .sheet-panel {
    max-height: min(85dvh, calc(100dvh - var(--keyboard-inset, 0px) - 2rem));
  }
}

.sheet-fade-enter-active,
.sheet-fade-leave-active {
  transition: opacity 0.25s ease;
}
.sheet-fade-enter-from,
.sheet-fade-leave-to {
  opacity: 0;
}
.sheet-fade-enter-active .sheet-panel,
.sheet-fade-leave-active .sheet-panel {
  transition: transform 0.28s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.2s ease;
}
.sheet-fade-enter-from .sheet-panel,
.sheet-fade-leave-to .sheet-panel {
  transform: translateY(100%);
}
@media (min-width: 640px) {
  .sheet-fade-enter-from .sheet-panel,
  .sheet-fade-leave-to .sheet-panel {
    transform: translateY(1.5rem) scale(0.97);
    opacity: 0;
  }
}
</style>
