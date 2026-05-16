<script setup lang="ts">
import { computed } from 'vue';
import { useInventory } from '../../composables/useInventory';
import { CubeIcon } from '@heroicons/vue/24/outline';
import WidgetShell from './WidgetShell.vue';

const props = defineProps<{
    productId: string;
}>();

const { items } = useInventory();

const item = computed(() => items.value.find(i => i.id === props.productId));

const totalQuantity = computed(() => {
    if (!item.value) return 0;
    return item.value.instances.reduce((sum, inst) => sum + inst.quantity, 0);
});

const nextExpiry = computed(() => {
    if (!item.value || !item.value.instances.length) return null;
    const upcoming = item.value.instances.find(i => i.expiry_date);
    return upcoming ? upcoming.expiry_date : null;
});

const formatDate = (d: string) => new Date(d).toLocaleDateString('de-DE');
</script>

<template>
  <WidgetShell v-if="item" :title="item.name" :icon="CubeIcon" tone="neutral" clickable>
    <div class="flex items-end gap-2">
      <div class="text-5xl font-bold tabular-nums leading-none">{{ totalQuantity }}</div>
      <div class="text-xs text-base-content/50 pb-1">Stück</div>
    </div>

    <div v-if="nextExpiry" class="mt-4 px-3 py-2 bg-base-200 rounded-lg flex justify-between items-center text-xs">
      <span class="text-base-content/60">Nächstes MHD</span>
      <span class="font-mono font-bold">{{ formatDate(nextExpiry) }}</span>
    </div>
    <div v-else class="mt-4 text-xs text-base-content/40">Kein MHD hinterlegt</div>
  </WidgetShell>

  <WidgetShell v-else title="Produkt" :icon="CubeIcon" muted>
    <div class="text-sm text-base-content/40">Nicht gefunden</div>
  </WidgetShell>
</template>
