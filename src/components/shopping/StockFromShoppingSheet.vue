<script setup lang="ts">
/**
 * „In den Vorrat buchen“: turns ticked-off shopping entries into inventory.
 * Entries whose name matches an existing product get a new package there;
 * everything else is created in the chosen location. Booked entries leave the
 * shopping list.
 */
import { ref, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import BottomSheet from '../ui/BottomSheet.vue';
import { useShoppingList, type ShoppingItem } from '../../composables/useShoppingList';
import { useInventory } from '../../composables/useInventory';
import { toast } from '../../composables/useToast';
import { normalize } from '../../utils/text';
import { parseOfferPrefix } from '../../utils/offerDate';
import { supabase } from '../../supabase';
import { CheckIcon } from '@heroicons/vue/24/outline';

const props = defineProps<{ open: boolean; entries: ShoppingItem[] }>();
const emit = defineEmits<{ (e: 'close'): void }>();

const router = useRouter();
const { items: shoppingItems } = useShoppingList();
const { locations, items, addItem, addInstance } = useInventory();

const LAST_LOC_KEY = 'stock_from_shopping_location';
const selected = ref<Set<string>>(new Set());
const locationId = ref<string | null>(null);
const saving = ref(false);

const productName = (e: ShoppingItem) => (parseOfferPrefix(e.title)?.rest ?? e.title).trim();
const matchFor = (e: ShoppingItem) => {
  const n = normalize(productName(e));
  return items.value.find((i) => normalize(i.name) === n) ?? null;
};

watch(
  () => props.open,
  (o) => {
    if (!o) return;
    selected.value = new Set(props.entries.map((e) => e.id));
    let last: string | null = null;
    try { last = localStorage.getItem(LAST_LOC_KEY); } catch { /* ignore */ }
    locationId.value = locations.value.some((l) => l.id === last) ? last : locations.value[0]?.id ?? null;
  },
);

const toggle = (id: string) => {
  const s = new Set(selected.value);
  s.has(id) ? s.delete(id) : s.add(id);
  selected.value = s;
};

const chosen = computed(() => props.entries.filter((e) => selected.value.has(e.id)));
const needsLocation = computed(() => chosen.value.some((e) => !matchFor(e)));

const book = async () => {
  if (chosen.value.length === 0) return;
  if (needsLocation.value && !locationId.value) return;
  saving.value = true;
  try {
    let count = 0;
    for (const e of chosen.value) {
      const match = matchFor(e);
      const ok = match
        ? await addInstance(match.id, 1, null)
        : await addItem({
            name: productName(e),
            locationId: locationId.value!,
            categoryId: null,
            quantity: 1,
            expiryDate: null,
            openedAt: null,
            minimumStock: null,
          });
      if (ok) count++;
    }
    const ids = chosen.value.map((e) => e.id);
    const { error } = await supabase.from('shopping_list').delete().in('id', ids);
    if (!error) shoppingItems.value = shoppingItems.value.filter((i) => !ids.includes(i.id));
    try { if (locationId.value) localStorage.setItem(LAST_LOC_KEY, locationId.value); } catch { /* ignore */ }
    toast.success(count === 1 ? 'Ein Produkt eingebucht' : `${count} Produkte eingebucht`);
    emit('close');
  } finally {
    saving.value = false;
  }
};
</script>

<template>
  <BottomSheet :open="open" title="In den Vorrat buchen" subtitle="Abgehakte Einkäufe einräumen" :persistent="saving" @close="emit('close')">
    <div v-if="locations.length === 0" class="py-6 text-center flex flex-col gap-3 items-center">
      <p class="text-sm text-base-content/70">Lege zuerst einen Lagerort an (z. B. Kühlschrank).</p>
      <button type="button" class="btn btn-primary btn-sm" @click="emit('close'); router.push({ name: 'locations' })">Zu den Vorräten</button>
    </div>
    <template v-else>
      <ul class="surface divide-y divide-base-200 overflow-hidden mb-4">
        <li v-for="e in entries" :key="e.id">
          <button type="button" class="w-full flex items-center gap-3 px-4 py-3 text-left" @click="toggle(e.id)">
            <span
              class="h-6 w-6 rounded-lg border-2 flex items-center justify-center shrink-0"
              :class="selected.has(e.id) ? 'bg-primary border-primary text-primary-content' : 'border-base-content/30'"
            >
              <CheckIcon v-if="selected.has(e.id)" class="h-4 w-4 stroke-[3]" />
            </span>
            <span class="flex-1 min-w-0">
              <span class="block truncate font-medium">{{ productName(e) }}</span>
              <span class="block text-xs text-base-content/55">
                {{ matchFor(e) ? '+1 Packung bei vorhandenem Produkt' : 'Neues Produkt' }}
              </span>
            </span>
          </button>
        </li>
      </ul>

      <div v-if="needsLocation" class="flex flex-col gap-1.5">
        <span class="text-sm font-semibold">Neue Produkte nach</span>
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
    </template>

    <template v-if="locations.length > 0" #footer>
      <button type="button" class="btn btn-ghost" @click="emit('close')">Abbrechen</button>
      <button
        type="button"
        class="btn btn-primary min-w-32"
        :disabled="saving || chosen.length === 0 || (needsLocation && !locationId)"
        @click="book"
      >
        <span v-if="saving" class="loading loading-spinner loading-sm" />
        {{ chosen.length }} einbuchen
      </button>
    </template>
  </BottomSheet>
</template>
