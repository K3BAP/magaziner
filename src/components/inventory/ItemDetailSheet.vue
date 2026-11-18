<script setup lang="ts">
/**
 * Everything about one product in one place: rename, move, category, minimum
 * stock, pin to the dashboard, and every package (instance) with its own
 * expiry date, opened date and quantity. Changes save immediately.
 */
import { ref, computed, watch } from 'vue';
import BottomSheet from '../ui/BottomSheet.vue';
import Stepper from '../ui/Stepper.vue';
import { useInventory, totalQuantity } from '../../composables/useInventory';
import { useDashboard } from '../../composables/useDashboard';
import { confirmDialog } from '../../composables/useConfirm';
import { expiryStatus, relativeDayLabel, todayLocalISO, formatShortDate } from '../../utils/date';
import { TrashIcon, PlusIcon, MapPinIcon as PinOutline } from '@heroicons/vue/24/outline';
import { MapPinIcon as PinSolid } from '@heroicons/vue/24/solid';

const props = defineProps<{ itemId: string | null }>();
const emit = defineEmits<{ (e: 'close'): void }>();

const {
  items,
  locations,
  categories,
  updateItem,
  deleteItem,
  addInstance,
  updateInstance,
  consumeOne,
  deleteInstance,
  addCategory,
} = useInventory();
const { isProductPinned, toggleProductPin } = useDashboard();

const item = computed(() => items.value.find((i) => i.id === props.itemId) ?? null);
const name = ref('');
const minStock = ref<number | null>(null);
const newCategory = ref('');
const showNewCategory = ref(false);

watch(
  () => props.itemId,
  () => {
    name.value = item.value?.name ?? '';
    minStock.value = item.value?.minimum_stock ?? null;
    newCategory.value = '';
    showNewCategory.value = false;
  },
  { immediate: true },
);

// The item vanished (last package used up, deleted elsewhere) → close.
watch(item, (it) => {
  if (props.itemId && !it) emit('close');
});

const locationCategories = computed(() =>
  categories.value.filter((c) => c.location_id === item.value?.location_id),
);

const saveName = () => {
  if (item.value && name.value.trim() && name.value.trim() !== item.value.name) {
    updateItem(item.value.id, { name: name.value.trim() });
  }
};
const saveMinStock = () => {
  if (!item.value) return;
  const v = minStock.value === null || (minStock.value as unknown) === '' ? null : Number(minStock.value);
  if (v !== item.value.minimum_stock) updateItem(item.value.id, { minimum_stock: v && v > 0 ? v : null });
};
const setCategory = (id: string | null) => item.value && updateItem(item.value.id, { category_id: id });
const createCategory = async () => {
  if (!item.value || !newCategory.value.trim()) return;
  const cat = await addCategory(newCategory.value, item.value.location_id);
  if (cat) setCategory(cat.id);
  newCategory.value = '';
  showNewCategory.value = false;
};
const move = (locationId: string) => {
  if (item.value && locationId !== item.value.location_id) updateItem(item.value.id, { location_id: locationId });
};

const toggleOpened = (instId: string, current: string | null | undefined) => {
  if (!item.value) return;
  updateInstance(item.value.id, instId, { opened_at: current ? null : todayLocalISO() });
};

const expiryTone = (iso: string | null) =>
  ({ expired: 'text-error', soon: 'text-warning', ok: 'text-base-content/60', none: 'text-base-content/40' })[
    expiryStatus(iso)
  ];

const removeProduct = async () => {
  if (!item.value) return;
  const ok = await confirmDialog({
    title: `„${item.value.name}“ löschen?`,
    message: `Alle ${item.value.instances.length} Packungen werden entfernt.`,
    confirmLabel: 'Löschen',
    danger: true,
  });
  if (!ok) return;
  const id = item.value.id;
  emit('close');
  deleteItem(id);
};
</script>

<template>
  <BottomSheet :open="!!item" size="lg" @close="emit('close')">
    <template #header>
      <input
        v-model="name"
        class="w-full bg-transparent font-display text-xl outline-none border-b-2 border-transparent focus:border-primary/40 pb-0.5"
        aria-label="Produktname"
        @blur="saveName"
        @keydown.enter.prevent="($event.target as HTMLInputElement).blur()"
      />
      <p v-if="item" class="text-sm text-base-content/60 mt-0.5">
        {{ totalQuantity(item) }} Stück · {{ item.instances.length }} {{ item.instances.length === 1 ? 'Packung' : 'Packungen' }}
      </p>
    </template>

    <div v-if="item" class="flex flex-col gap-6">
      <!-- Packages -->
      <section class="flex flex-col gap-2">
        <div class="flex items-center justify-between">
          <h4 class="text-sm font-semibold">Packungen</h4>
          <button type="button" class="btn btn-sm btn-ghost gap-1 text-primary" @click="addInstance(item.id, 1, null)">
            <PlusIcon class="h-4 w-4" /> Packung
          </button>
        </div>
        <div class="surface divide-y divide-base-200 overflow-hidden">
          <div v-for="inst in item.instances" :key="inst.id" class="flex flex-col gap-2 px-4 py-3">
            <div class="flex items-center gap-3">
              <div class="flex-1 min-w-0">
                <div class="text-sm font-semibold" :class="expiryTone(inst.expiry_date)">
                  {{ inst.expiry_date ? `Haltbar bis ${formatShortDate(inst.expiry_date)}` : 'Ohne Ablaufdatum' }}
                </div>
                <div v-if="inst.expiry_date" class="text-xs text-base-content/50">{{ relativeDayLabel(inst.expiry_date) }}</div>
              </div>
              <Stepper
                :value="inst.quantity"
                size="sm"
                @dec="consumeOne(item.id, inst.id)"
                @inc="updateInstance(item.id, inst.id, { quantity: inst.quantity + 1 })"
              />
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <input
                type="date"
                class="input input-sm w-auto rounded-full"
                :value="inst.expiry_date ?? ''"
                aria-label="Ablaufdatum"
                @change="updateInstance(item.id, inst.id, { expiry_date: ($event.target as HTMLInputElement).value || null })"
              />
              <button
                type="button"
                class="btn btn-sm rounded-full border-0"
                :class="inst.opened_at ? 'bg-info/15 text-info' : 'bg-base-200'"
                @click="toggleOpened(inst.id, inst.opened_at)"
              >
                {{ inst.opened_at ? `Geöffnet ${formatShortDate(inst.opened_at)}` : 'Als geöffnet markieren' }}
              </button>
              <button
                type="button"
                class="btn btn-sm btn-ghost btn-circle ml-auto text-base-content/50"
                aria-label="Packung entfernen"
                @click="deleteInstance(item.id, inst.id)"
              >
                <TrashIcon class="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- Location -->
      <section class="flex flex-col gap-2">
        <h4 class="text-sm font-semibold">Lagerort</h4>
        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="l in locations"
            :key="l.id"
            type="button"
            class="btn btn-sm rounded-full border-0 gap-1"
            :class="item.location_id === l.id ? 'btn-primary' : 'bg-base-200'"
            @click="move(l.id)"
          >
            <span>{{ l.icon || '📦' }}</span>{{ l.name }}
          </button>
        </div>
      </section>

      <!-- Category -->
      <section class="flex flex-col gap-2">
        <h4 class="text-sm font-semibold">Kategorie</h4>
        <div class="flex flex-wrap gap-1.5">
          <button
            type="button"
            class="btn btn-sm rounded-full border-0"
            :class="!item.category_id ? 'btn-primary' : 'bg-base-200'"
            @click="setCategory(null)"
          >
            Keine
          </button>
          <button
            v-for="c in locationCategories"
            :key="c.id"
            type="button"
            class="btn btn-sm rounded-full border-0"
            :class="item.category_id === c.id ? 'btn-primary' : 'bg-base-200'"
            @click="setCategory(c.id)"
          >
            {{ c.name }}
          </button>
          <button type="button" class="btn btn-sm rounded-full btn-ghost gap-1" @click="showNewCategory = !showNewCategory">
            <PlusIcon class="h-4 w-4" /> Neu
          </button>
        </div>
        <form v-if="showNewCategory" class="flex gap-2" @submit.prevent="createCategory">
          <input v-model="newCategory" class="input input-sm flex-1" placeholder="Neue Kategorie" autofocus />
          <button type="submit" class="btn btn-sm btn-primary" :disabled="!newCategory.trim()">Anlegen</button>
        </form>
      </section>

      <!-- Minimum + pin -->
      <section class="grid grid-cols-2 gap-3">
        <label class="flex flex-col gap-1.5">
          <span class="text-sm font-semibold">Mindestbestand</span>
          <input
            v-model.number="minStock"
            type="number"
            min="0"
            inputmode="numeric"
            class="input w-full"
            placeholder="–"
            @change="saveMinStock"
          />
        </label>
        <div class="flex flex-col gap-1.5">
          <span class="text-sm font-semibold">Dashboard</span>
          <button
            type="button"
            class="btn gap-2 border-0"
            :class="isProductPinned(item.id) ? 'btn-primary' : 'bg-base-200'"
            @click="toggleProductPin(item.id)"
          >
            <component :is="isProductPinned(item.id) ? PinSolid : PinOutline" class="h-5 w-5" />
            {{ isProductPinned(item.id) ? 'Angepinnt' : 'Anpinnen' }}
          </button>
        </div>
      </section>
      <p class="text-xs text-base-content/50 -mt-3">
        Fällt der Bestand unter den Mindestbestand, landet das Produkt automatisch auf der ersten Einkaufsliste.
        <template v-if="item.barcode"> · Barcode {{ item.barcode }}</template>
      </p>
    </div>

    <template #footer>
      <button type="button" class="btn btn-ghost text-error mr-auto gap-1" @click="removeProduct">
        <TrashIcon class="h-5 w-5" /> Produkt löschen
      </button>
      <button type="button" class="btn btn-primary min-w-28" @click="saveName(); saveMinStock(); emit('close')">Fertig</button>
    </template>
  </BottomSheet>
</template>
