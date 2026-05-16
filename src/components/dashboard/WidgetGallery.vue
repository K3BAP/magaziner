<script setup lang="ts">
import { ref, computed, nextTick, watch } from 'vue';
import { useInventory } from '../../composables/useInventory';
import { useDashboard } from '../../composables/useDashboard';
import type { WidgetType } from '../../composables/useDashboard';
import { XMarkIcon, PlusIcon } from '@heroicons/vue/24/outline';

const props = defineProps<{ open: boolean }>();
const emit = defineEmits<{ (e: 'close'): void }>();

const { items, getLocationName } = useInventory();
const { addWidget, isProductPinned } = useDashboard();

interface CatalogEntry {
  type: WidgetType;
  emoji: string;
  title: string;
  description: string;
  needsPicker?: 'product' | 'shortcut';
}

const SECTIONS: { heading: string; entries: CatalogEntry[] }[] = [
  {
    heading: 'Übersicht',
    entries: [
      { type: 'expired', emoji: '⚠️', title: 'Abgelaufen', description: 'Anzahl überfälliger Produkte.' },
      { type: 'soon', emoji: '⏳', title: 'Bald fällig', description: 'In den nächsten 14 Tagen.' },
      { type: 'opened', emoji: '🧪', title: 'Geöffnet', description: 'Angebrochene Produkte.' },
      { type: 'inventory-chart', emoji: '📊', title: 'Zustand', description: 'Torte: OK / fällig / abgelaufen.' },
      { type: 'location-chart', emoji: '📍', title: 'Orte', description: 'Balken: Produkte pro Ort.' },
      { type: 'recent-activity', emoji: '🕒', title: 'Letzte Aktivität', description: 'Was zuletzt passiert ist.' },
    ],
  },
  {
    heading: 'Aktionen',
    entries: [
      { type: 'quick-add', emoji: '⚡', title: 'Schnell hinzufügen', description: 'Vorrat aufstocken ohne Umwege.' },
      { type: 'todos', emoji: '✅', title: 'Aufgaben', description: 'Offene Todos im Blick.' },
      { type: 'shopping-list', emoji: '🛒', title: 'Einkaufsliste', description: 'Anzahl offener Einträge.' },
      { type: 'finance-snapshot', emoji: '💶', title: 'Finanzen', description: 'Ausgaben des Monats.' },
    ],
  },
  {
    heading: 'Verknüpfungen',
    entries: [
      { type: 'shortcut', emoji: '🔗', title: 'Verknüpfung', description: 'Direktlink zu einer Ansicht.', needsPicker: 'shortcut' },
      { type: 'product', emoji: '📦', title: 'Einzelprodukt', description: 'Bestand eines Produkts.', needsPicker: 'product' },
    ],
  },
];

const SHORTCUT_OPTIONS = [
  { title: 'Vorräte', routeName: 'locations', icon: '📦' },
  { title: 'Aufgaben', routeName: 'todos', icon: '✅' },
  { title: 'Einkaufsliste', routeName: 'shoppingList', icon: '🛒' },
  { title: 'Rezepte', routeName: 'recipes', icon: '📖' },
  { title: 'Finanzen', routeName: 'finance', icon: '💶' },
  { title: 'Alle Artikel', routeName: 'allItems', icon: '📋' },
];

const pickerMode = ref<'product' | 'shortcut' | null>(null);
const productQuery = ref('');

const filteredProducts = computed(() => {
  const q = productQuery.value.trim().toLowerCase();
  if (!q) return items.value.slice(0, 30);
  return items.value.filter(i => i.name.toLowerCase().includes(q)).slice(0, 30);
});

const close = () => {
  pickerMode.value = null;
  productQuery.value = '';
  emit('close');
};

const handleTile = (entry: CatalogEntry) => {
  if (entry.needsPicker === 'product') {
    pickerMode.value = 'product';
    return;
  }
  if (entry.needsPicker === 'shortcut') {
    pickerMode.value = 'shortcut';
    return;
  }
  addWidget(entry.type);
  close();
};

const pickProduct = (id: string) => {
  if (isProductPinned(id)) {
    close();
    return;
  }
  addWidget('product', { productId: id });
  close();
};

const pickShortcut = (opt: typeof SHORTCUT_OPTIONS[number]) => {
  addWidget('shortcut', { ...opt });
  close();
};

// --- Animated height transition when switching sub-views ---
const innerEl = ref<HTMLElement | null>(null);
const measuredHeight = ref<string>('auto');
const animating = ref(false);

// Cap the animated height so we never animate to something larger than the visible sheet area.
const maxHeightPx = () => Math.round(window.innerHeight * 0.75);

watch(pickerMode, async () => {
  if (!innerEl.value) return;
  // 1. Pin current (old) height in px so 'auto' becomes a length the browser can transition from
  const oldH = Math.min(innerEl.value.scrollHeight, maxHeightPx());
  measuredHeight.value = oldH + 'px';
  animating.value = true;
  // 2. Wait for Vue to render the new content
  await nextTick();
  await nextTick();
  // 3. Measure new content and animate to it
  if (innerEl.value) {
    const newH = Math.min(innerEl.value.scrollHeight, maxHeightPx());
    measuredHeight.value = newH + 'px';
  }
}, { flush: 'pre' });

const onHeightTransitionEnd = (e: TransitionEvent) => {
  if (e.propertyName !== 'height') return;
  // Release the explicit height so future intrinsic changes (typing, etc.) feel natural
  measuredHeight.value = 'auto';
  animating.value = false;
};

const onSheetAfterLeave = () => {
  // Reset internal state once the sheet has fully left
  measuredHeight.value = 'auto';
  animating.value = false;
};
</script>

<template>
  <Teleport to="body">
    <!-- Backdrop fade -->
    <Transition name="backdrop">
      <div v-if="props.open" class="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" @click="close" />
    </Transition>

    <!-- Sheet slide-up -->
    <Transition name="sheet" @after-leave="onSheetAfterLeave">
      <div
        v-if="props.open"
        class="fixed inset-x-0 bottom-0 z-50 sm:inset-0 sm:flex sm:items-center sm:justify-center pointer-events-none"
      >
        <div
          class="sheet-box pointer-events-auto bg-base-100 w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col overflow-hidden mx-auto"
          style="max-height: 90vh"
        >
          <!-- Header -->
          <div class="flex items-center justify-between px-5 py-4 border-b border-base-200 bg-base-100 shrink-0">
            <div>
              <h2 class="font-bold text-lg">
                {{ pickerMode === 'product' ? 'Produkt wählen' : pickerMode === 'shortcut' ? 'Ziel wählen' : 'Widget hinzufügen' }}
              </h2>
              <p v-if="!pickerMode" class="text-xs text-base-content/50">Tippe ein Widget an, um es einzufügen.</p>
            </div>
            <button class="btn btn-sm btn-circle btn-ghost" @click="pickerMode ? (pickerMode = null) : close()" aria-label="Schließen">
              <XMarkIcon class="h-5 w-5" />
            </button>
          </div>

          <!-- Animated body: height transitions between sub-views -->
          <div
            class="transition-[height] duration-300 ease-out"
            :class="animating ? 'overflow-hidden' : 'overflow-y-auto'"
            :style="{ height: measuredHeight }"
            @transitionend="onHeightTransitionEnd"
          >
            <div ref="innerEl" class="p-5">
              <!-- Catalog -->
              <div v-if="!pickerMode" key="catalog">
                <div v-for="section in SECTIONS" :key="section.heading" class="mb-6 last:mb-0">
                  <h3 class="text-xs uppercase tracking-wider font-semibold text-base-content/50 mb-3">{{ section.heading }}</h3>
                  <div class="grid grid-cols-2 gap-3">
                    <button
                      v-for="entry in section.entries"
                      :key="entry.type + entry.title"
                      class="group flex flex-col items-start gap-2 p-4 rounded-2xl border border-base-300/60 bg-base-100 hover:border-primary hover:shadow-md hover:-translate-y-0.5 transition-all text-left"
                      @click="handleTile(entry)"
                    >
                      <div class="flex items-center justify-between w-full">
                        <span class="text-3xl">{{ entry.emoji }}</span>
                        <span class="rounded-full bg-base-200 group-hover:bg-primary group-hover:text-primary-content p-1.5 transition-colors">
                          <PlusIcon class="h-4 w-4" />
                        </span>
                      </div>
                      <div>
                        <div class="font-semibold text-sm">{{ entry.title }}</div>
                        <div class="text-xs text-base-content/50 leading-snug">{{ entry.description }}</div>
                      </div>
                    </button>
                  </div>
                </div>
              </div>

              <!-- Product picker -->
              <div v-else-if="pickerMode === 'product'" key="product">
                <input
                  v-model="productQuery"
                  type="text"
                  placeholder="Produkt suchen..."
                  class="input input-bordered w-full mb-3"
                />
                <div v-if="filteredProducts.length === 0" class="text-sm text-base-content/50 text-center py-8">
                  Keine Produkte gefunden.
                </div>
                <ul v-else class="flex flex-col gap-1">
                  <li v-for="p in filteredProducts" :key="p.id">
                    <button
                      class="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-base-200 text-left"
                      :class="isProductPinned(p.id) ? 'opacity-60' : ''"
                      :disabled="isProductPinned(p.id)"
                      @click="pickProduct(p.id)"
                    >
                      <div class="min-w-0">
                        <div class="font-medium truncate">{{ p.name }}</div>
                        <div class="text-xs text-base-content/50 truncate">📍 {{ getLocationName(p.location_id) }}</div>
                      </div>
                      <span v-if="isProductPinned(p.id)" class="badge badge-ghost badge-sm">Schon dran</span>
                      <PlusIcon v-else class="h-5 w-5 text-primary shrink-0" />
                    </button>
                  </li>
                </ul>
              </div>

              <!-- Shortcut picker -->
              <div v-else-if="pickerMode === 'shortcut'" key="shortcut">
                <div class="grid grid-cols-2 gap-3">
                  <button
                    v-for="opt in SHORTCUT_OPTIONS"
                    :key="opt.routeName"
                    class="flex flex-col items-center gap-2 p-4 rounded-2xl border border-base-300/60 bg-base-100 hover:border-primary hover:shadow-md transition-all"
                    @click="pickShortcut(opt)"
                  >
                    <span class="text-3xl">{{ opt.icon }}</span>
                    <span class="font-semibold text-sm">{{ opt.title }}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* Backdrop fade */
.backdrop-enter-active,
.backdrop-leave-active { transition: opacity 0.25s ease; }
.backdrop-enter-from,
.backdrop-leave-to { opacity: 0; }

/* Sheet slide-up: animate the inner box, not the fixed wrapper */
.sheet-enter-active .sheet-box,
.sheet-leave-active .sheet-box {
  transition: transform 0.35s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.25s ease;
}
.sheet-enter-from .sheet-box,
.sheet-leave-to .sheet-box {
  transform: translateY(100%);
  opacity: 0.6;
}
</style>
