<script setup lang="ts">
import { computed } from 'vue';
import { useInventory, totalQuantity } from '../../composables/useInventory';
import { relativeDayLabel, expiryStatus } from '../../utils/date';
import { CubeIcon } from '@heroicons/vue/24/outline';
import WidgetShell from './WidgetShell.vue';
import Stepper from '../ui/Stepper.vue';

const props = defineProps<{ productId: string }>();
const { items, consumeOne, updateInstance, addInstance } = useInventory();

const item = computed(() => items.value.find((i) => i.id === props.productId));
const total = computed(() => (item.value ? totalQuantity(item.value) : 0));
const nextExpiry = computed(() => item.value?.instances.find((i) => i.expiry_date)?.expiry_date ?? null);

const dec = () => {
  const inst = item.value?.instances[0];
  if (item.value && inst) consumeOne(item.value.id, inst.id);
};
const inc = () => {
  if (!item.value) return;
  const inst = item.value.instances[0];
  if (inst && item.value.instances.length === 1) updateInstance(item.value.id, inst.id, { quantity: inst.quantity + 1 });
  else addInstance(item.value.id, 1, null);
};
</script>

<template>
  <WidgetShell v-if="item" :title="item.name" :icon="CubeIcon" tone="primary">
    <div class="mt-auto flex flex-col gap-2" @click.stop>
      <Stepper :value="total" size="sm" @dec="dec" @inc="inc" />
      <span
        v-if="nextExpiry"
        class="text-xs"
        :class="{ 'text-error font-semibold': expiryStatus(nextExpiry) === 'expired', 'text-warning font-semibold': expiryStatus(nextExpiry) === 'soon', 'text-base-content/55': expiryStatus(nextExpiry) === 'ok' }"
      >
        bis {{ relativeDayLabel(nextExpiry) }}
      </span>
    </div>
  </WidgetShell>
  <WidgetShell v-else title="Produkt" :icon="CubeIcon" muted>
    <div class="text-sm text-base-content/50 mt-auto">Aufgebraucht oder gelöscht</div>
  </WidgetShell>
</template>
