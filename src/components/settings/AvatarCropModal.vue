<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount } from 'vue';
import { loadImageBitmap, encodeProfileImage } from '../../utils/image';
import {
  XMarkIcon,
  MagnifyingGlassMinusIcon,
  MagnifyingGlassPlusIcon,
  CheckIcon,
} from '@heroicons/vue/24/outline';

const props = defineProps<{
  file: File | null;
}>();

const emit = defineEmits<{
  (e: 'cancel'): void;
  (e: 'cropped', file: File): void;
}>();

// --- Constants ---
const VIEWPORT = 280;       // px, square viewport size in the modal
const MAX_ZOOM = 4;         // 4x of cover-fit baseline
const MIN_ZOOM = 1;         // can't shrink below "cover" — would expose viewport edges

// --- State ---
const bitmap = ref<ImageBitmap | null>(null);
const objectUrl = ref<string | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);
const encoding = ref(false);

// Pan in viewport pixels, relative to "image centered in viewport".
const offsetX = ref(0);
const offsetY = ref(0);
// 1 = cover-fit baseline, larger = zoomed in.
const zoom = ref(1);

// --- Derived ---
// Scale factor that fits the image's shorter side into the viewport (cover).
const baseScale = computed(() => {
  if (!bitmap.value) return 1;
  return VIEWPORT / Math.min(bitmap.value.width, bitmap.value.height);
});

const renderedWidth = computed(() =>
  bitmap.value ? bitmap.value.width * baseScale.value * zoom.value : 0,
);
const renderedHeight = computed(() =>
  bitmap.value ? bitmap.value.height * baseScale.value * zoom.value : 0,
);

// Maximum |offset| in each axis (image must always cover the viewport).
const maxOffsetX = computed(() => Math.max(0, (renderedWidth.value - VIEWPORT) / 2));
const maxOffsetY = computed(() => Math.max(0, (renderedHeight.value - VIEWPORT) / 2));

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

const setOffset = (x: number, y: number) => {
  offsetX.value = clamp(x, -maxOffsetX.value, maxOffsetX.value);
  offsetY.value = clamp(y, -maxOffsetY.value, maxOffsetY.value);
};

// Re-clamp when zoom changes (zooming out can leave the image out of bounds).
watch(zoom, () => setOffset(offsetX.value, offsetY.value));

const imageStyle = computed(() => ({
  position: 'absolute' as const,
  left: '50%',
  top: '50%',
  width: `${renderedWidth.value}px`,
  height: `${renderedHeight.value}px`,
  // Tailwind's preflight sets `img { max-width: 100% }`, which silently
  // clamps the image's rendered width to the crop viewport's 280px — wide
  // images get squeezed and zoom only affects the height. Explicitly opt out.
  maxWidth: 'none' as const,
  maxHeight: 'none' as const,
  transform: `translate(calc(-50% + ${offsetX.value}px), calc(-50% + ${offsetY.value}px))`,
  pointerEvents: 'none' as const,
  userSelect: 'none' as const,
  willChange: 'transform' as const,
}));

// --- Load when file prop arrives ---
watch(
  () => props.file,
  async (file) => {
    cleanup();
    if (!file) return;
    loading.value = true;
    error.value = null;
    try {
      bitmap.value = await loadImageBitmap(file);
      objectUrl.value = URL.createObjectURL(file);
      // Reset transform to defaults
      zoom.value = 1;
      offsetX.value = 0;
      offsetY.value = 0;
    } catch (e: any) {
      error.value = e?.message ?? 'Bild konnte nicht geladen werden.';
    } finally {
      loading.value = false;
    }
  },
  { immediate: true },
);

function cleanup() {
  if (bitmap.value) {
    bitmap.value.close();
    bitmap.value = null;
  }
  if (objectUrl.value) {
    URL.revokeObjectURL(objectUrl.value);
    objectUrl.value = null;
  }
}
onBeforeUnmount(cleanup);

// --- Pointer interactions ---
const dragging = ref(false);
let dragStartX = 0;
let dragStartY = 0;
let dragOffsetX = 0;
let dragOffsetY = 0;
let dragPointerId: number | null = null;

const onPointerDown = (e: PointerEvent) => {
  if (!bitmap.value) return;
  if (e.button !== undefined && e.button !== 0) return; // left-button / touch only
  (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
  dragging.value = true;
  dragPointerId = e.pointerId;
  dragStartX = e.clientX;
  dragStartY = e.clientY;
  dragOffsetX = offsetX.value;
  dragOffsetY = offsetY.value;
  e.preventDefault();
};

const onPointerMove = (e: PointerEvent) => {
  if (!dragging.value || e.pointerId !== dragPointerId) return;
  setOffset(dragOffsetX + (e.clientX - dragStartX), dragOffsetY + (e.clientY - dragStartY));
};

const onPointerUp = (e: PointerEvent) => {
  if (e.pointerId !== dragPointerId) return;
  dragging.value = false;
  dragPointerId = null;
};

const onWheel = (e: WheelEvent) => {
  if (!bitmap.value) return;
  e.preventDefault();
  // Negative deltaY = wheel up = zoom in (matches map / photo apps).
  const factor = Math.exp(-e.deltaY * 0.0015);
  zoom.value = clamp(zoom.value * factor, MIN_ZOOM, MAX_ZOOM);
};

// --- Save ---
const onSave = async () => {
  if (!bitmap.value) return;
  encoding.value = true;
  error.value = null;
  try {
    // Translate viewport-space transform back to source-image pixels.
    // At zoom z and offset (ox, oy), the viewport's top-left corner sits at
    // source pixel ((rW - V)/2 - ox, (rH - V)/2 - oy) / (baseScale * z).
    const pxPerSrc = baseScale.value * zoom.value;
    const side = VIEWPORT / pxPerSrc;
    const sx = ((renderedWidth.value - VIEWPORT) / 2 - offsetX.value) / pxPerSrc;
    const sy = ((renderedHeight.value - VIEWPORT) / 2 - offsetY.value) / pxPerSrc;

    const file = await encodeProfileImage(bitmap.value, { sx, sy, side });
    emit('cropped', file);
  } catch (e: any) {
    error.value = e?.message ?? 'Verarbeitung fehlgeschlagen.';
  } finally {
    encoding.value = false;
  }
};

const onCancel = () => emit('cancel');
</script>

<template>
  <Teleport to="body">
    <div
      v-if="props.file"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      @click.self="onCancel"
    >
      <div class="bg-base-100 rounded-2xl shadow-2xl w-full max-w-sm flex flex-col overflow-hidden">
        <!-- Header -->
        <div class="flex items-center justify-between px-5 py-3 border-b border-base-200">
          <h2 class="font-bold text-base">Bildausschnitt wählen</h2>
          <button class="btn btn-sm btn-circle btn-ghost" @click="onCancel" aria-label="Schließen">
            <XMarkIcon class="h-5 w-5" />
          </button>
        </div>

        <!-- Crop viewport -->
        <div class="p-5 flex flex-col items-center gap-4">
          <div
            class="crop-viewport relative overflow-hidden bg-base-300 select-none touch-none"
            :style="{ width: `${VIEWPORT}px`, height: `${VIEWPORT}px` }"
            @pointerdown="onPointerDown"
            @pointermove="onPointerMove"
            @pointerup="onPointerUp"
            @pointercancel="onPointerUp"
            @wheel.passive.prevent="onWheel"
          >
            <img
              v-if="objectUrl"
              :src="objectUrl"
              :style="imageStyle"
              alt=""
              draggable="false"
            />

            <!-- Circular mask: dim everything outside the circle -->
            <div
              class="absolute inset-0 pointer-events-none"
              :style="{
                boxShadow: `0 0 0 9999px rgba(0,0,0,0.55)`,
                borderRadius: '50%',
                margin: '0',
              }"
            />
            <!-- Crisp circle outline -->
            <div
              class="absolute inset-0 rounded-full border-2 border-white/80 pointer-events-none"
            />

            <!-- Cursor hint -->
            <div
              v-if="!loading && !error"
              class="absolute inset-0 flex items-center justify-center text-white/0 cursor-grab active:cursor-grabbing"
              :class="dragging ? 'cursor-grabbing' : 'cursor-grab'"
            />

            <!-- Loading / error overlays -->
            <div v-if="loading" class="absolute inset-0 flex items-center justify-center bg-base-300">
              <span class="loading loading-spinner loading-md" />
            </div>
            <div v-if="error" class="absolute inset-0 flex items-center justify-center bg-base-300 text-error text-xs text-center p-4">
              {{ error }}
            </div>
          </div>

          <!-- Zoom slider -->
          <div class="flex items-center gap-3 w-full">
            <MagnifyingGlassMinusIcon class="h-5 w-5 text-base-content/60 shrink-0" />
            <input
              v-model.number="zoom"
              type="range"
              :min="MIN_ZOOM"
              :max="MAX_ZOOM"
              step="0.01"
              class="range range-sm range-primary flex-1"
              :disabled="!bitmap"
            />
            <MagnifyingGlassPlusIcon class="h-5 w-5 text-base-content/60 shrink-0" />
          </div>

          <p class="text-xs text-base-content/50 text-center">
            Ziehen zum Verschieben, Schieberegler oder Mausrad zum Zoomen.
          </p>
        </div>

        <!-- Footer -->
        <div class="flex items-center justify-end gap-2 px-5 py-3 border-t border-base-200">
          <button
            type="button"
            class="btn btn-ghost btn-sm"
            :disabled="encoding"
            @click="onCancel"
          >
            Abbrechen
          </button>
          <button
            type="button"
            class="btn btn-primary btn-sm gap-1"
            :disabled="!bitmap || encoding || !!error"
            @click="onSave"
          >
            <span v-if="encoding" class="loading loading-spinner loading-xs" />
            <CheckIcon v-else class="h-4 w-4" />
            Verwenden
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.crop-viewport img {
  /* Make sure the browser doesn't try to interpret pan gestures as scroll. */
  touch-action: none;
}
</style>
