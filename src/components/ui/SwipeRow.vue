<script setup lang="ts">
/**
 * Row that reveals a destructive action when swiped left. Releasing past the
 * threshold fires `swipe`; callers pair that with an undo toast, never with a
 * confirmation dialog. Vertical scrolling stays native (touch-action: pan-y).
 */
import { ref } from 'vue';
import { TrashIcon } from '@heroicons/vue/24/outline';

const props = withDefaults(defineProps<{ label?: string; disabled?: boolean }>(), { label: 'Löschen' });
const emit = defineEmits<{ (e: 'swipe'): void }>();

const dx = ref(0);
const animating = ref(false);
let startX = 0;
let startY = 0;
let tracking: 'idle' | 'pending' | 'horizontal' | 'vertical' = 'idle';
const THRESHOLD = 96;

const onDown = (e: PointerEvent) => {
  if (props.disabled || e.pointerType === 'mouse') return;
  startX = e.clientX;
  startY = e.clientY;
  tracking = 'pending';
  animating.value = false;
};
const onMove = (e: PointerEvent) => {
  if (tracking === 'idle' || tracking === 'vertical') return;
  const ddx = e.clientX - startX;
  const ddy = e.clientY - startY;
  if (tracking === 'pending') {
    if (Math.abs(ddy) > 8 && Math.abs(ddy) > Math.abs(ddx)) {
      tracking = 'vertical';
      return;
    }
    if (Math.abs(ddx) > 8) {
      tracking = 'horizontal';
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    } else return;
  }
  dx.value = Math.min(0, ddx);
};
const onUp = () => {
  const fire = tracking === 'horizontal' && dx.value < -THRESHOLD;
  tracking = 'idle';
  animating.value = true;
  if (fire) {
    dx.value = -window.innerWidth;
    navigator.vibrate?.(10);
    setTimeout(() => {
      emit('swipe');
      dx.value = 0;
    }, 180);
  } else {
    dx.value = 0;
  }
};
</script>

<template>
  <div class="relative overflow-hidden">
    <div
      class="absolute inset-0 flex items-center justify-end pr-5 bg-error text-error-content"
      :style="{ opacity: dx < -8 ? 1 : 0 }"
      aria-hidden="true"
    >
      <span class="flex items-center gap-2 font-semibold text-sm" :class="dx < -THRESHOLD ? 'scale-110' : ''">
        <TrashIcon class="h-5 w-5" /> {{ label }}
      </span>
    </div>
    <div
      class="relative bg-base-100"
      :style="{
        transform: dx ? `translateX(${dx}px)` : undefined,
        transition: animating ? 'transform 0.2s cubic-bezier(0.2,0.8,0.2,1)' : 'none',
        touchAction: 'pan-y',
      }"
      @pointerdown="onDown"
      @pointermove="onMove"
      @pointerup="onUp"
      @pointercancel="onUp"
    >
      <slot />
    </div>
  </div>
</template>
