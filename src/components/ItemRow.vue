<script setup lang="ts">
import { computed } from 'vue';
import { useInventory, totalQuantity, itemExpiryStatus, isBelowMinimum, type Item } from '../composables/useInventory';
import { relativeDayLabel } from '../utils/date';
import Stepper from './ui/Stepper.vue';

const props = defineProps<{ item: Item; showLocation?: boolean }>();
const emit = defineEmits<{ (e: 'open', item: Item): void }>();

const { getLocation, consumeOne, updateInstance, addInstance } = useInventory();

const total = computed(() => totalQuantity(props.item));
const status = computed(() => itemExpiryStatus(props.item));
const soonest = computed(() => props.item.instances.find((i) => i.expiry_date)?.expiry_date ?? null);
const opened = computed(() => props.item.instances.some((i) => i.opened_at));
const location = computed(() => (props.showLocation ? getLocation(props.item.location_id) : null));
const low = computed(() => isBelowMinimum(props.item));
const single = computed(() => props.item.instances.length === 1);

const dot = computed(
  () => ({ expired: 'bg-error', soon: 'bg-warning', ok: 'bg-success/60', none: 'bg-base-content/15' })[status.value],
);
const expiryText = computed(
  () => ({ expired: 'text-error font-semibold', soon: 'text-warning font-semibold', ok: 'text-base-content/55', none: '' })[status.value],
);

const dec = () => {
  // Use up the package that expires first.
  const inst = props.item.instances[0];
  if (inst) consumeOne(props.item.id, inst.id);
};
const inc = () => {
  if (single.value) {
    const inst = props.item.instances[0];
    updateInstance(props.item.id, inst.id, { quantity: inst.quantity + 1 });
  } else {
    addInstance(props.item.id, 1, null);
  }
};
</script>

<template>
  <div class="flex items-center gap-3 pl-4 pr-2 min-h-16 bg-base-100">
    <span class="h-2.5 w-2.5 rounded-full shrink-0" :class="dot" aria-hidden="true" />
    <button type="button" class="flex-1 min-w-0 text-left py-2.5" @click="emit('open', item)">
      <span class="block text-[17px] leading-snug truncate font-medium">{{ item.name }}</span>
      <span class="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs mt-0.5 text-base-content/55">
        <span v-if="location">{{ location.icon || '📦' }} {{ location.name }}</span>
        <span v-if="soonest" :class="expiryText">{{ status === 'expired' ? 'abgelaufen ' : 'bis ' }}{{ relativeDayLabel(soonest) }}</span>
        <span v-if="opened" class="text-info font-medium">geöffnet</span>
        <span v-if="item.instances.length > 1">{{ item.instances.length }} Packungen</span>
        <span v-if="low" class="text-accent font-semibold">knapp</span>
      </span>
    </button>
    <Stepper :value="total" size="sm" @dec="dec" @inc="inc" />
  </div>
</template>
