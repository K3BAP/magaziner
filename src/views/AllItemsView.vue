<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useInventory, itemExpiryStatus, isBelowMinimum, type Item } from '../composables/useInventory';
import ItemRow from '../components/ItemRow.vue';
import ItemDetailSheet from '../components/inventory/ItemDetailSheet.vue';
import EmptyState from '../components/ui/EmptyState.vue';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/vue/24/outline';

type Filter = 'expired' | 'soon' | 'opened' | 'low';

const route = useRoute();
const router = useRouter();
const { items, matchesQuery } = useInventory();

const query = ref('');
const sortBy = ref<'name' | 'expiry'>('name');
const filter = ref<Filter | null>((route.query.filter as Filter) || null);
const detailId = ref<string | null>(null);
const searchInput = ref<HTMLInputElement | null>(null);

watch(filter, (f) => router.replace({ query: f ? { filter: f } : {} }));

onMounted(async () => {
  if (filter.value) return; // came from a summary chip — don't pop the keyboard
  await nextTick();
  searchInput.value?.focus();
});

const FILTERS: { key: Filter; label: string; test: (i: Item) => boolean }[] = [
  { key: 'expired', label: 'Abgelaufen', test: (i) => itemExpiryStatus(i) === 'expired' },
  { key: 'soon', label: 'Bald fällig', test: (i) => itemExpiryStatus(i) === 'soon' },
  { key: 'opened', label: 'Geöffnet', test: (i) => i.instances.some((x) => x.opened_at) },
  { key: 'low', label: 'Knapp', test: isBelowMinimum },
];

const soonest = (i: Item) => i.instances.find((x) => x.expiry_date)?.expiry_date ?? '9999-12-31';

const results = computed(() => {
  const f = FILTERS.find((x) => x.key === filter.value);
  return items.value
    .filter((i) => (!f || f.test(i)) && matchesQuery(i, query.value))
    .sort((a, b) =>
      sortBy.value === 'name' ? a.name.localeCompare(b.name, 'de') : soonest(a).localeCompare(soonest(b)),
    );
});

const toggleFilter = (k: Filter) => {
  filter.value = filter.value === k ? null : k;
  if (filter.value === 'expired' || filter.value === 'soon') sortBy.value = 'expiry';
};
</script>

<template>
  <div>
    <label class="input w-full rounded-full bg-base-100 border-0 mb-3">
      <MagnifyingGlassIcon class="h-5 w-5 opacity-50" />
      <input ref="searchInput" v-model="query" type="search" placeholder="Produkt, Kategorie oder Ort" autocomplete="off" />
      <button v-if="query" type="button" class="btn btn-ghost btn-xs btn-circle" aria-label="Suche leeren" @click="query = ''">
        <XMarkIcon class="h-4 w-4" />
      </button>
    </label>

    <div class="-mx-4 px-4 flex gap-1.5 overflow-x-auto pb-1 mb-3">
      <button
        v-for="f in FILTERS"
        :key="f.key"
        type="button"
        class="btn btn-sm rounded-full border-0 shrink-0"
        :class="filter === f.key ? 'btn-primary' : 'bg-base-100'"
        @click="toggleFilter(f.key)"
      >
        {{ f.label }}
      </button>
    </div>

    <div class="flex items-center justify-between px-1 mb-2">
      <span class="text-xs font-semibold text-base-content/55">{{ results.length }} {{ results.length === 1 ? 'Produkt' : 'Produkte' }}</span>
      <div class="join">
        <button type="button" class="btn btn-xs join-item" :class="sortBy === 'name' ? 'btn-neutral' : 'btn-ghost'" @click="sortBy = 'name'">A–Z</button>
        <button type="button" class="btn btn-xs join-item" :class="sortBy === 'expiry' ? 'btn-neutral' : 'btn-ghost'" @click="sortBy = 'expiry'">Ablauf</button>
      </div>
    </div>

    <div v-if="results.length" class="surface overflow-hidden divide-y divide-base-200">
      <ItemRow v-for="item in results" :key="item.id" :item="item" show-location @open="detailId = $event.id" />
    </div>
    <EmptyState
      v-else
      compact
      icon="🔍"
      :title="query || filter ? 'Keine Treffer' : 'Noch keine Produkte'"
      :text="query ? 'Umlaute sind egal – „Muesli“ findet auch „Müsli“.' : undefined"
    />

    <ItemDetailSheet :item-id="detailId" @close="detailId = null" />
  </div>
</template>
