<script setup lang="ts">
/**
 * „Neues Produkt“ – used by the location page, the scanner and the dashboard.
 * Picks location + category inline, offers quick expiry presets, and warns
 * when a product with the same name already exists (offering +1 instead).
 */
import { ref, computed, watch } from 'vue';
import BottomSheet from '../ui/BottomSheet.vue';
import Stepper from '../ui/Stepper.vue';
import { useInventory, type Item } from '../../composables/useInventory';
import { todayLocalISO, addDaysISO } from '../../utils/date';
import { normalize } from '../../utils/text';
import { PlusIcon } from '@heroicons/vue/24/outline';

const props = defineProps<{
  open: boolean;
  locationId?: string | null;
  initialName?: string;
  barcode?: string | null;
  /** Hint shown above the form, e.g. the OpenFoodFacts result. */
  notice?: string | null;
}>();
const emit = defineEmits<{ (e: 'close'): void; (e: 'saved', item: Item): void }>();

const { locations, categories, items, addItem, addCategory, addInstance, updateItem } = useInventory();

const name = ref('');
const locationId = ref<string | null>(null);
const categoryId = ref<string | null>(null);
const newCategory = ref('');
const showNewCategory = ref(false);
const quantity = ref(1);
const expiry = ref('');
const opened = ref(false);
const minStock = ref<number | null>(null);
const showMore = ref(false);
const saving = ref(false);

watch(
  () => props.open,
  (o) => {
    if (!o) return;
    name.value = props.initialName ?? '';
    locationId.value = props.locationId ?? locations.value[0]?.id ?? null;
    categoryId.value = null;
    newCategory.value = '';
    showNewCategory.value = false;
    quantity.value = 1;
    expiry.value = '';
    opened.value = false;
    minStock.value = null;
    showMore.value = false;
  },
  { immediate: true },
);

watch(locationId, () => (categoryId.value = null));

const locationCategories = computed(() => categories.value.filter((c) => c.location_id === locationId.value));

const duplicate = computed(() => {
  const n = normalize(name.value);
  if (!n) return null;
  return items.value.find((i) => normalize(i.name) === n && i.location_id === locationId.value) ?? null;
});

const today = todayLocalISO();
const expiryPresets = [
  { label: '+3 Tage', value: addDaysISO(today, 3) },
  { label: '+1 Woche', value: addDaysISO(today, 7) },
  { label: '+1 Monat', value: addDaysISO(today, 30) },
  { label: '+1 Jahr', value: addDaysISO(today, 365) },
];

const save = async () => {
  if (!name.value.trim() || !locationId.value || saving.value) return;
  saving.value = true;
  try {
    let catId = categoryId.value;
    if (showNewCategory.value && newCategory.value.trim()) {
      const cat = await addCategory(newCategory.value, locationId.value);
      catId = cat?.id ?? null;
    }
    const item = await addItem({
      name: name.value,
      locationId: locationId.value,
      categoryId: catId,
      quantity: quantity.value,
      expiryDate: expiry.value || null,
      openedAt: opened.value ? today : null,
      minimumStock: minStock.value || null,
      barcode: props.barcode ?? null,
    });
    if (item) {
      emit('saved', item);
      emit('close');
    }
  } finally {
    saving.value = false;
  }
};

const addToExisting = async () => {
  if (!duplicate.value) return;
  saving.value = true;
  try {
    const inst = await addInstance(duplicate.value.id, quantity.value, expiry.value || null, opened.value ? today : null);
    if (inst && props.barcode && !duplicate.value.barcode) {
      await updateItem(duplicate.value.id, { barcode: props.barcode });
    }
    if (inst) {
      emit('saved', duplicate.value);
      emit('close');
    }
  } finally {
    saving.value = false;
  }
};
</script>

<template>
  <BottomSheet :open="open" title="Neues Produkt" :persistent="saving" @close="emit('close')">
    <form class="flex flex-col gap-5" @submit.prevent="save">
      <div v-if="notice" class="rounded-2xl bg-info/10 text-sm px-4 py-3">{{ notice }}</div>

      <div class="flex flex-col gap-1.5">
        <input
          v-model="name"
          class="input input-lg w-full font-medium"
          placeholder="Was kommt rein? z. B. Milch"
          autocomplete="off"
          enterkeyhint="done"
          :autofocus="!initialName"
        />
        <div v-if="duplicate" class="flex items-center gap-2 text-sm rounded-xl bg-warning/15 px-3 py-2">
          <span class="flex-1">„{{ duplicate.name }}“ gibt es hier schon.</span>
          <button type="button" class="btn btn-xs btn-warning" @click="addToExisting">Packung dazu</button>
        </div>
      </div>

      <div class="flex flex-col gap-2">
        <span class="text-sm font-semibold">Wo?</span>
        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="l in locations"
            :key="l.id"
            type="button"
            class="btn btn-sm rounded-full border-0 gap-1"
            :class="locationId === l.id ? 'btn-primary' : 'bg-base-200'"
            @click="locationId = l.id"
          >
            <span>{{ l.icon || '📦' }}</span>{{ l.name }}
          </button>
        </div>
      </div>

      <div class="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-3">
        <span class="text-sm font-semibold">Menge</span>
        <div><Stepper :value="quantity" @dec="quantity = Math.max(1, quantity - 1)" @inc="quantity++" /></div>
      </div>

      <div class="flex flex-col gap-2">
        <span class="text-sm font-semibold">Haltbar bis</span>
        <div class="flex flex-wrap items-center gap-1.5">
          <button
            v-for="p in expiryPresets"
            :key="p.label"
            type="button"
            class="btn btn-sm rounded-full border-0"
            :class="expiry === p.value ? 'btn-primary' : 'bg-base-200'"
            @click="expiry = expiry === p.value ? '' : p.value"
          >
            {{ p.label }}
          </button>
          <input v-model="expiry" type="date" class="input input-sm w-auto rounded-full" aria-label="Datum wählen" />
        </div>
      </div>

      <div class="flex flex-col gap-2">
        <span class="text-sm font-semibold">Kategorie</span>
        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="c in locationCategories"
            :key="c.id"
            type="button"
            class="btn btn-sm rounded-full border-0"
            :class="categoryId === c.id && !showNewCategory ? 'btn-primary' : 'bg-base-200'"
            @click="categoryId = categoryId === c.id ? null : c.id; showNewCategory = false"
          >
            {{ c.name }}
          </button>
          <button
            type="button"
            class="btn btn-sm rounded-full gap-1"
            :class="showNewCategory ? 'btn-primary' : 'btn-ghost border-dashed border-base-300'"
            @click="showNewCategory = !showNewCategory"
          >
            <PlusIcon class="h-4 w-4" /> Neu
          </button>
        </div>
        <input
          v-if="showNewCategory"
          v-model="newCategory"
          class="input w-full"
          placeholder="Name der neuen Kategorie"
          autocomplete="off"
        />
      </div>

      <button type="button" class="btn btn-ghost btn-sm self-start -ml-2" @click="showMore = !showMore">
        {{ showMore ? 'Weniger Optionen' : 'Mehr Optionen' }}
      </button>
      <div v-if="showMore" class="flex flex-col gap-4 -mt-2">
        <label class="flex items-center gap-3 cursor-pointer">
          <input v-model="opened" type="checkbox" class="toggle toggle-primary" />
          <span class="text-sm font-semibold">Schon geöffnet (heute)</span>
        </label>
        <label class="flex flex-col gap-1.5">
          <span class="text-sm font-semibold">Mindestbestand</span>
          <input v-model.number="minStock" type="number" min="0" inputmode="numeric" class="input w-full" placeholder="Darunter kommt es auf die Einkaufsliste" />
        </label>
        <p v-if="barcode" class="text-xs text-base-content/55">Barcode {{ barcode }} wird gespeichert – beim nächsten Scan erkenne ich das Produkt sofort.</p>
      </div>
      <button type="submit" class="hidden" />
    </form>

    <template #footer>
      <button type="button" class="btn btn-ghost" @click="emit('close')">Abbrechen</button>
      <button type="button" class="btn btn-primary min-w-32" :disabled="!name.trim() || !locationId || saving" @click="save">
        <span v-if="saving" class="loading loading-spinner loading-sm" />
        Speichern
      </button>
    </template>
  </BottomSheet>
</template>
