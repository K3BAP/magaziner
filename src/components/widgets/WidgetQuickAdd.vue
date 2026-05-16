<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useInventory } from '../../composables/useInventory';
import type { Item } from '../../composables/useInventory';
import WidgetShell from './WidgetShell.vue';
import { BoltIcon, PlusIcon, XMarkIcon, QrCodeIcon } from '@heroicons/vue/24/outline';

const router = useRouter();
const { items, addInstance, getLocationName } = useInventory();

const openScanner = () => router.push({ name: 'scanner' });

const query = ref('');
const selected = ref<Item | null>(null);
const qty = ref(1);
const expiry = ref('');
const justAdded = ref(false);

const matches = computed(() => {
  const q = query.value.trim().toLowerCase();
  if (!q) return [];
  return items.value
    .filter(i => i.name.toLowerCase().includes(q))
    .slice(0, 5);
});

const pick = (i: Item) => {
  selected.value = i;
  qty.value = 1;
  expiry.value = '';
  query.value = '';
};

const cancel = () => {
  selected.value = null;
  qty.value = 1;
  expiry.value = '';
};

const submit = async () => {
  if (!selected.value || qty.value < 1) return;
  await addInstance(selected.value.id, qty.value, expiry.value || null, null);
  justAdded.value = true;
  cancel();
  setTimeout(() => { justAdded.value = false; }, 1800);
};
</script>

<template>
  <WidgetShell title="Schnell hinzufügen" :icon="BoltIcon" tone="primary">
    <!-- Selected: inline form -->
    <div v-if="selected" class="flex flex-col gap-2">
      <div class="flex items-center justify-between gap-2">
        <div class="min-w-0 flex-1">
          <div class="font-semibold truncate">{{ selected.name }}</div>
          <div class="text-xs text-base-content/50 truncate">📍 {{ getLocationName(selected.location_id) }}</div>
        </div>
        <button class="btn btn-xs btn-ghost btn-circle" @click="cancel" aria-label="Abbrechen">
          <XMarkIcon class="h-4 w-4" />
        </button>
      </div>
      <div class="flex gap-2">
        <div class="flex items-center gap-1 bg-base-200 rounded-lg px-1 py-1">
          <button class="btn btn-xs btn-square btn-ghost" :disabled="qty <= 1" @click="qty = Math.max(1, qty - 1)">-</button>
          <span class="font-bold w-6 text-center text-sm tabular-nums">{{ qty }}</span>
          <button class="btn btn-xs btn-square btn-ghost" @click="qty += 1">+</button>
        </div>
        <input v-model="expiry" type="date" class="input input-sm input-bordered flex-1 min-w-0" />
        <button class="btn btn-sm btn-primary gap-1" @click="submit">
          <PlusIcon class="h-4 w-4" /> Speichern
        </button>
      </div>
    </div>

    <!-- Search input -->
    <div v-else class="relative">
      <div class="flex gap-2">
        <input
          v-model="query"
          type="text"
          placeholder="Vorrat suchen..."
          class="input input-sm input-bordered flex-1 min-w-0"
        />
        <button
          class="btn btn-sm btn-square btn-primary shrink-0"
          @click="openScanner"
          title="Barcode scannen"
          aria-label="Barcode scannen"
        >
          <QrCodeIcon class="h-5 w-5" />
        </button>
      </div>
      <Transition name="fade">
        <div v-if="justAdded" class="absolute inset-0 flex items-center justify-center bg-success/10 rounded-lg text-success text-sm font-semibold">
          ✓ Hinzugefügt
        </div>
      </Transition>
      <ul v-if="matches.length > 0" class="mt-2 flex flex-col gap-1 max-h-48 overflow-y-auto">
        <li v-for="m in matches" :key="m.id">
          <button
            class="w-full text-left px-3 py-2 rounded-lg bg-base-200 hover:bg-base-300 text-sm flex justify-between items-center"
            @click="pick(m)"
          >
            <span class="truncate font-medium">{{ m.name }}</span>
            <span class="text-xs text-base-content/50 shrink-0 ml-2">{{ getLocationName(m.location_id) }}</span>
          </button>
        </li>
      </ul>
      <div v-else-if="query.trim().length > 0" class="mt-2 text-xs text-base-content/50">
        Kein passender Vorrat gefunden.
      </div>
    </div>
  </WidgetShell>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
