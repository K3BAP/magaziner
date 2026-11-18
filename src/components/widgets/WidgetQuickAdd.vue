<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useInventory, totalQuantity, type Item } from '../../composables/useInventory';
import { toast } from '../../composables/useToast';
import WidgetShell from './WidgetShell.vue';
import ItemFormSheet from '../inventory/ItemFormSheet.vue';
import { BoltIcon, QrCodeIcon, MagnifyingGlassIcon, PlusIcon } from '@heroicons/vue/24/outline';

const router = useRouter();
const { items, addInstance, getLocation, matchesQuery } = useInventory();

const query = ref('');
const formOpen = ref(false);
const formName = ref('');

const matches = computed(() => {
  if (!query.value.trim()) return [];
  return items.value.filter((i) => matchesQuery(i, query.value)).slice(0, 4);
});

const plusOne = async (i: Item) => {
  const ok = await addInstance(i.id, 1, null);
  if (ok) toast.success(`+1 ${i.name}`);
  query.value = '';
};

const createNew = () => {
  formName.value = query.value.trim();
  query.value = '';
  formOpen.value = true;
};
</script>

<template>
  <WidgetShell title="Schnell einräumen" :icon="BoltIcon" tone="primary">
    <div class="flex gap-2">
      <label class="input input-sm flex-1 min-w-0 rounded-full bg-base-200 border-0 h-10">
        <MagnifyingGlassIcon class="h-4 w-4 opacity-50" />
        <input v-model="query" type="search" placeholder="Produkt suchen oder neu anlegen" autocomplete="off" />
      </label>
      <button
        type="button"
        class="btn btn-primary btn-circle h-10 w-10 shrink-0"
        title="Barcode scannen"
        aria-label="Barcode scannen"
        @click="router.push({ name: 'scanner' })"
      >
        <QrCodeIcon class="h-5 w-5" />
      </button>
    </div>
    <ul v-if="query.trim()" class="mt-2 flex flex-col gap-1">
      <li v-for="m in matches" :key="m.id">
        <button type="button" class="w-full flex items-center gap-3 px-3 py-2 rounded-xl bg-base-200 active:bg-base-300 text-left" @click="plusOne(m)">
          <span>{{ getLocation(m.location_id)?.icon || '📦' }}</span>
          <span class="flex-1 min-w-0">
            <span class="block truncate font-medium text-sm">{{ m.name }}</span>
            <span class="block text-xs text-base-content/55">{{ totalQuantity(m) }} vorrätig</span>
          </span>
          <span class="text-xs font-semibold text-primary">+1</span>
        </button>
      </li>
      <li>
        <button type="button" class="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left text-sm text-primary font-semibold" @click="createNew">
          <PlusIcon class="h-4 w-4" /> „{{ query.trim() }}“ neu anlegen
        </button>
      </li>
    </ul>
    <ItemFormSheet :open="formOpen" :initial-name="formName" @close="formOpen = false" />
  </WidgetShell>
</template>
