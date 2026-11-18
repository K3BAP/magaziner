<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useInventory, type Item } from '../composables/useInventory';
import { usePageTitle } from '../composables/usePageTitle';
import ItemRow from '../components/ItemRow.vue';
import ItemFormSheet from '../components/inventory/ItemFormSheet.vue';
import ItemDetailSheet from '../components/inventory/ItemDetailSheet.vue';
import LocationSheet from '../components/inventory/LocationSheet.vue';
import CategoriesSheet from '../components/inventory/CategoriesSheet.vue';
import AppFab from '../components/ui/AppFab.vue';
import EmptyState from '../components/ui/EmptyState.vue';
import SectionHeader from '../components/ui/SectionHeader.vue';
import Skeleton from '../components/ui/Skeleton.vue';
import { PlusIcon, PencilSquareIcon, TagIcon, MagnifyingGlassIcon, XMarkIcon } from '@heroicons/vue/24/outline';

const props = defineProps<{ id: string }>();
const router = useRouter();

const { getLocation, getItemsByLocation, matchesQuery, loading, loaded } = useInventory();

const location = computed(() => getLocation(props.id));
usePageTitle(() => (location.value ? `${location.value.icon || '📦'} ${location.value.name}` : null));

const data = getItemsByLocation(props.id);
const query = ref('');

const filtered = computed(() => {
  const q = query.value;
  const f = (list: Item[]) => (q ? list.filter((i) => matchesQuery(i, q)) : list);
  return {
    uncategorized: f(data.value.uncategorized),
    grouped: data.value.grouped.map((g) => ({ ...g, items: f(g.items) })).filter((g) => g.items.length > 0),
  };
});
const totalCount = computed(
  () => data.value.uncategorized.length + data.value.grouped.reduce((n, g) => n + g.items.length, 0),
);
const visibleCount = computed(
  () => filtered.value.uncategorized.length + filtered.value.grouped.reduce((n, g) => n + g.items.length, 0),
);

const addOpen = ref(false);
const detailId = ref<string | null>(null);
const locationSheet = ref(false);
const categoriesSheet = ref(false);
</script>

<template>
  <div>
    <Teleport to="#header-actions" defer>
      <button type="button" class="btn btn-ghost btn-circle" aria-label="Kategorien" title="Kategorien" @click="categoriesSheet = true">
        <TagIcon class="h-6 w-6" />
      </button>
      <button type="button" class="btn btn-ghost btn-circle" aria-label="Ort bearbeiten" title="Ort bearbeiten" @click="locationSheet = true">
        <PencilSquareIcon class="h-6 w-6" />
      </button>
    </Teleport>

    <Skeleton v-if="loading && !loaded" :rows="5" height="4rem" />

    <EmptyState v-else-if="!location" icon="🤷" title="Diesen Ort gibt es nicht mehr.">
      <button type="button" class="btn btn-primary btn-sm" @click="router.push({ name: 'locations' })">Zu den Vorräten</button>
    </EmptyState>

    <template v-else>
      <label v-if="totalCount > 6" class="input w-full mb-4 rounded-full bg-base-100 border-0">
        <MagnifyingGlassIcon class="h-5 w-5 opacity-50" />
        <input v-model="query" type="search" placeholder="In diesem Ort suchen" autocomplete="off" />
        <button v-if="query" type="button" class="btn btn-ghost btn-xs btn-circle" aria-label="Suche leeren" @click="query = ''">
          <XMarkIcon class="h-4 w-4" />
        </button>
      </label>

      <div class="flex flex-col gap-5">
        <section v-if="filtered.uncategorized.length > 0">
          <SectionHeader v-if="filtered.grouped.length > 0" title="Ohne Kategorie" :count="filtered.uncategorized.length" />
          <div class="surface overflow-hidden divide-y divide-base-200">
            <ItemRow v-for="item in filtered.uncategorized" :key="item.id" :item="item" @open="detailId = $event.id" />
          </div>
        </section>

        <section v-for="group in filtered.grouped" :key="group.id">
          <SectionHeader :title="group.name" :count="group.items.length" />
          <div class="surface overflow-hidden divide-y divide-base-200">
            <ItemRow v-for="item in group.items" :key="item.id" :item="item" @open="detailId = $event.id" />
          </div>
        </section>
      </div>

      <EmptyState v-if="totalCount === 0" icon="🫙" title="Hier ist noch nichts drin" text="Füge Produkte hinzu oder scanne einen Barcode.">
        <button type="button" class="btn btn-primary gap-2" @click="addOpen = true"><PlusIcon class="h-5 w-5" /> Produkt hinzufügen</button>
      </EmptyState>
      <EmptyState v-else-if="visibleCount === 0" compact icon="🔍" :title="`Nichts gefunden für „${query}“`" />

      <AppFab label="Produkt" extended @click="addOpen = true">
        <PlusIcon class="h-6 w-6" />
      </AppFab>
    </template>

    <ItemFormSheet :open="addOpen" :location-id="id" @close="addOpen = false" />
    <ItemDetailSheet :item-id="detailId" @close="detailId = null" />
    <LocationSheet :open="locationSheet" :location="location" @close="locationSheet = false" @deleted="router.replace({ name: 'locations' })" />
    <CategoriesSheet :open="categoriesSheet" :location-id="id" @close="categoriesSheet = false" />
  </div>
</template>
