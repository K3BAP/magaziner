<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useInventory, itemExpiryStatus, isBelowMinimum, type Location } from '../composables/useInventory';
import LocationSheet from '../components/inventory/LocationSheet.vue';
import ItemFormSheet from '../components/inventory/ItemFormSheet.vue';
import AppFab from '../components/ui/AppFab.vue';
import EmptyState from '../components/ui/EmptyState.vue';
import { MagnifyingGlassIcon, QrCodeIcon, PlusIcon, EllipsisHorizontalIcon } from '@heroicons/vue/24/outline';

const router = useRouter();
const { locations, items, loading, loaded } = useInventory();

const sheetOpen = ref(false);
const editing = ref<Location | null>(null);
const addOpen = ref(false);

const statsFor = (locId: string) => {
  const locItems = items.value.filter((i) => i.location_id === locId);
  let expired = 0;
  let soon = 0;
  for (const it of locItems) {
    const s = itemExpiryStatus(it);
    if (s === 'expired') expired++;
    else if (s === 'soon') soon++;
  }
  return { count: locItems.length, expired, soon };
};

const summary = computed(() => {
  let expired = 0;
  let soon = 0;
  let opened = 0;
  let low = 0;
  for (const it of items.value) {
    const s = itemExpiryStatus(it);
    if (s === 'expired') expired++;
    else if (s === 'soon') soon++;
    if (it.instances.some((i) => i.opened_at)) opened++;
    if (isBelowMinimum(it)) low++;
  }
  return [
    { key: 'expired', label: 'abgelaufen', n: expired, tone: 'bg-error/12 text-error' },
    { key: 'soon', label: 'bald fällig', n: soon, tone: 'bg-warning/15 text-warning-content dark:text-warning' },
    { key: 'opened', label: 'geöffnet', n: opened, tone: 'bg-info/12 text-info' },
    { key: 'low', label: 'knapp', n: low, tone: 'bg-accent/12 text-accent' },
  ].filter((s) => s.n > 0);
});

const openNew = () => {
  editing.value = null;
  sheetOpen.value = true;
};
const openEdit = (loc: Location) => {
  editing.value = loc;
  sheetOpen.value = true;
};
</script>

<template>
  <div>
    <Teleport to="#header-actions" defer>
      <RouterLink :to="{ name: 'allItems' }" class="btn btn-ghost btn-circle" aria-label="Produkte suchen" title="Suchen">
        <MagnifyingGlassIcon class="h-6 w-6" />
      </RouterLink>
      <RouterLink :to="{ name: 'scanner' }" class="btn btn-ghost btn-circle" aria-label="Barcode scannen" title="Scannen">
        <QrCodeIcon class="h-6 w-6" />
      </RouterLink>
    </Teleport>

    <div v-if="summary.length" class="flex flex-wrap gap-2 mb-4">
      <RouterLink
        v-for="s in summary"
        :key="s.key"
        :to="{ name: 'allItems', query: { filter: s.key } }"
        class="pressable rounded-full px-3 py-1.5 text-sm font-semibold"
        :class="s.tone"
      >
        {{ s.n }} {{ s.label }}
      </RouterLink>
    </div>

    <div v-if="loading && !loaded" class="grid grid-cols-2 gap-3">
      <div v-for="i in 4" :key="i" class="skeleton h-32 rounded-[1.25rem]" />
    </div>

    <template v-else>
      <EmptyState
        v-if="locations.length === 0"
        icon="🧺"
        title="Noch keine Lagerorte"
        text="Lege Orte wie „Kühlschrank“, „Vorratsschrank“ oder „Bad“ an und räume deine Produkte ein."
      >
        <button type="button" class="btn btn-primary gap-2" @click="openNew"><PlusIcon class="h-5 w-5" /> Ersten Ort anlegen</button>
      </EmptyState>

      <div v-else class="grid grid-cols-2 gap-3">
        <div
          v-for="loc in locations"
          :key="loc.id"
          role="link"
          tabindex="0"
          class="surface pressable relative p-4 flex flex-col gap-3 min-h-32 cursor-pointer"
          @click="router.push({ name: 'location', params: { id: loc.id } })"
          @keydown.enter="router.push({ name: 'location', params: { id: loc.id } })"
        >
          <div class="flex items-start justify-between">
            <span class="h-12 w-12 rounded-2xl bg-base-200 flex items-center justify-center text-2xl">{{ loc.icon || '📦' }}</span>
            <button
              type="button"
              class="btn btn-ghost btn-sm btn-circle -mr-2 -mt-1 text-base-content/50"
              :aria-label="`${loc.name} bearbeiten`"
              @click.stop="openEdit(loc)"
            >
              <EllipsisHorizontalIcon class="h-5 w-5" />
            </button>
          </div>
          <div class="min-w-0">
            <div class="font-semibold truncate">{{ loc.name }}</div>
            <div class="flex items-center gap-2 text-xs text-base-content/55 mt-0.5">
              <span>{{ statsFor(loc.id).count }} {{ statsFor(loc.id).count === 1 ? 'Produkt' : 'Produkte' }}</span>
              <span v-if="statsFor(loc.id).expired" class="flex items-center gap-1 text-error font-semibold">
                <span class="h-1.5 w-1.5 rounded-full bg-error" />{{ statsFor(loc.id).expired }}
              </span>
              <span v-if="statsFor(loc.id).soon" class="flex items-center gap-1 text-warning font-semibold">
                <span class="h-1.5 w-1.5 rounded-full bg-warning" />{{ statsFor(loc.id).soon }}
              </span>
            </div>
          </div>
        </div>

        <button
          type="button"
          class="pressable rounded-[1.25rem] border-2 border-dashed border-base-content/15 flex flex-col items-center justify-center gap-1 min-h-32 text-base-content/55"
          @click="openNew"
        >
          <PlusIcon class="h-7 w-7" />
          <span class="font-medium text-sm">Ort hinzufügen</span>
        </button>
      </div>
    </template>

    <AppFab v-if="locations.length > 0" label="Produkt" extended @click="addOpen = true">
      <PlusIcon class="h-6 w-6" />
    </AppFab>

    <LocationSheet :open="sheetOpen" :location="editing" @close="sheetOpen = false" />
    <ItemFormSheet :open="addOpen" @close="addOpen = false" />
  </div>
</template>
