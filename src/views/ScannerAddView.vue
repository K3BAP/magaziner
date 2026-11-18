<script setup lang="ts">
/**
 * Barcode scanner. A known barcode (saved on a product since 2.0) is
 * recognised instantly and offers „+1 Packung“; an unknown one is looked up in
 * OpenFoodFacts and opens the new-product form prefilled. Scanning continues
 * after each product so a whole shopping bag can be put away in one go.
 */
import { ref, computed } from 'vue';
import { QrcodeStream } from 'vue-qrcode-reader';
import { useInventory, totalQuantity, type Item } from '../composables/useInventory';
import { toast } from '../composables/useToast';
import ItemFormSheet from '../components/inventory/ItemFormSheet.vue';
import BottomSheet from '../components/ui/BottomSheet.vue';
import { PencilSquareIcon, VideoCameraSlashIcon } from '@heroicons/vue/24/outline';

const { findByBarcode, addInstance, getLocation, locations } = useInventory();

const LAST_LOC_KEY = 'scanner_last_location';
const lastLocation = ref<string | null>(
  (() => {
    try { return localStorage.getItem(LAST_LOC_KEY); } catch { return null; }
  })(),
);

const paused = ref(false);
const fetching = ref(false);
const cameraError = ref<string | null>(null);
const manualCode = ref('');
const lastCode = ref<string | null>(null);

// Known product → quick action sheet
const known = ref<Item | null>(null);
// Unknown product → form
const formOpen = ref(false);
const formName = ref('');
const formNotice = ref<string | null>(null);

const scanning = computed(() => !paused.value && !formOpen.value && !known.value);

const lookup = async (code: string): Promise<string | null> => {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 6000);
  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=product_name,product_name_de,brands`,
      { signal: ctrl.signal },
    );
    const data = await res.json();
    if (data.status !== 1 || !data.product) return null;
    const p = data.product;
    const name = (p.product_name_de || p.product_name || '').trim();
    return name || null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
};

const handleCode = async (code: string) => {
  code = code.trim();
  if (!code || paused.value) return;
  paused.value = true;
  lastCode.value = code;
  navigator.vibrate?.(30);

  const existing = findByBarcode(code);
  if (existing) {
    known.value = existing;
    return;
  }

  fetching.value = true;
  const name = await lookup(code);
  fetching.value = false;
  formName.value = name ?? '';
  formNotice.value = name
    ? `Gefunden in OpenFoodFacts: „${name}“. Passe den Namen gerne an.`
    : 'Dieses Produkt kenne ich noch nicht – gib ihm einen Namen. Beim nächsten Scan erkenne ich es wieder.';
  formOpen.value = true;
};

const onDetect = (codes: { rawValue?: string }[]) => {
  const code = codes?.[0]?.rawValue;
  if (code) handleCode(code);
};

const onCameraError = (err: Error) => {
  cameraError.value =
    err.name === 'NotAllowedError'
      ? 'Kein Kamerazugriff. Erlaube die Kamera in den Browser-Einstellungen oder gib den Barcode unten ein.'
      : err.name === 'NotFoundError'
        ? 'Keine Kamera gefunden. Gib den Barcode unten ein.'
        : 'Die Kamera konnte nicht gestartet werden. Gib den Barcode unten ein.';
};

const submitManual = () => {
  const code = manualCode.value;
  manualCode.value = '';
  handleCode(code);
};

const resume = () => {
  known.value = null;
  formOpen.value = false;
  setTimeout(() => (paused.value = false), 600); // don't instantly re-read the same code
};

const addOneToKnown = async () => {
  if (!known.value) return;
  const ok = await addInstance(known.value.id, 1, null);
  if (ok) toast.success(`+1 ${known.value.name}`);
  resume();
};

const onSaved = (item: Item) => {
  lastLocation.value = item.location_id;
  try { localStorage.setItem(LAST_LOC_KEY, item.location_id); } catch { /* ignore */ }
  toast.success(`„${item.name}“ gespeichert`);
};

const openManualForm = () => {
  paused.value = true;
  lastCode.value = null;
  formName.value = '';
  formNotice.value = null;
  formOpen.value = true;
};

const defaultLocation = computed(() =>
  locations.value.some((l) => l.id === lastLocation.value) ? lastLocation.value : null,
);
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="relative w-full aspect-[4/5] max-h-[60dvh] rounded-3xl overflow-hidden bg-neutral shadow-xl">
      <QrcodeStream
        v-if="!cameraError"
        :paused="!scanning"
        :formats="['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'qr_code']"
        @detect="onDetect"
        @error="onCameraError"
      />
      <div v-else class="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center text-neutral-content">
        <VideoCameraSlashIcon class="h-10 w-10 opacity-70" />
        <p class="text-sm">{{ cameraError }}</p>
      </div>

      <!-- Viewfinder -->
      <div v-if="!cameraError" class="absolute inset-0 pointer-events-none flex items-center justify-center">
        <div class="w-3/4 aspect-[3/2] rounded-2xl border-[3px] border-white/85 shadow-[0_0_0_100vmax_rgba(0,0,0,0.35)]" />
      </div>
      <div
        v-if="fetching"
        class="absolute inset-x-0 bottom-0 p-4 flex items-center justify-center gap-2 bg-black/50 text-white text-sm"
      >
        <span class="loading loading-spinner loading-sm" /> Suche {{ lastCode }} …
      </div>
      <div v-else-if="scanning && !cameraError" class="absolute inset-x-0 bottom-0 p-4 text-center text-white/90 text-sm bg-gradient-to-t from-black/50">
        Barcode in den Rahmen halten
      </div>
    </div>

    <form class="flex gap-2" @submit.prevent="submitManual">
      <input
        v-model="manualCode"
        class="input flex-1 rounded-full"
        inputmode="numeric"
        placeholder="Barcode eintippen"
        autocomplete="off"
        aria-label="Barcode eintippen"
      />
      <button type="submit" class="btn btn-primary rounded-full" :disabled="!manualCode.trim()">Suchen</button>
    </form>

    <button type="button" class="btn btn-ghost gap-2" @click="openManualForm">
      <PencilSquareIcon class="h-5 w-5" /> Ohne Barcode anlegen
    </button>

    <!-- Known product -->
    <BottomSheet :open="!!known" size="sm" title="Kenne ich schon!" @close="resume">
      <div v-if="known" class="flex items-center gap-3 surface p-4">
        <span class="text-3xl">{{ getLocation(known.location_id)?.icon || '📦' }}</span>
        <div class="min-w-0">
          <div class="font-semibold truncate">{{ known.name }}</div>
          <div class="text-sm text-base-content/60">
            {{ getLocation(known.location_id)?.name }} · {{ totalQuantity(known) }} vorrätig
          </div>
        </div>
      </div>
      <template #footer>
        <button type="button" class="btn btn-ghost" @click="resume">Abbrechen</button>
        <button type="button" class="btn btn-primary min-w-32" @click="addOneToKnown">+1 Packung</button>
      </template>
    </BottomSheet>

    <ItemFormSheet
      :open="formOpen"
      :initial-name="formName"
      :barcode="lastCode"
      :notice="formNotice"
      :location-id="defaultLocation"
      @saved="onSaved"
      @close="resume"
    />
  </div>
</template>
