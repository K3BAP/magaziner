<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import BottomSheet from '../ui/BottomSheet.vue';
import { useInventory, type Location } from '../../composables/useInventory';
import { confirmDialog } from '../../composables/useConfirm';
import { TrashIcon } from '@heroicons/vue/24/outline';

const props = defineProps<{ open: boolean; location?: Location | null }>();
const emit = defineEmits<{ (e: 'close'): void; (e: 'deleted'): void; (e: 'created', loc: Location): void }>();

const { items, addLocation, updateLocation, deleteLocation } = useInventory();

const ICONS = ['❄️', '🧊', '🥫', '📦', '🧺', '🍷', '🥖', '🍎', '🥩', '🧀', '🍫', '☕', '🧹', '🧴', '🛁', '💊', '🐾', '🧰', '🔋', '🎁'];
const name = ref('');
const icon = ref('📦');
const isEdit = computed(() => !!props.location);
const productCount = computed(() =>
  props.location ? items.value.filter((i) => i.location_id === props.location!.id).length : 0,
);

watch(
  () => props.open,
  (o) => {
    if (!o) return;
    name.value = props.location?.name ?? '';
    icon.value = props.location?.icon ?? '📦';
  },
  { immediate: true },
);

const save = async () => {
  if (!name.value.trim()) return;
  if (props.location) await updateLocation(props.location.id, name.value, icon.value);
  else {
    const created = await addLocation(name.value, icon.value);
    if (created) emit('created', created);
  }
  emit('close');
};

const remove = async () => {
  if (!props.location) return;
  const ok = await confirmDialog({
    title: `„${props.location.name}“ löschen?`,
    message:
      productCount.value > 0
        ? `Damit werden auch ${productCount.value} ${productCount.value === 1 ? 'Produkt' : 'Produkte'} darin gelöscht. Das lässt sich nicht rückgängig machen.`
        : 'Der Ort ist leer.',
    confirmLabel: 'Löschen',
    danger: true,
  });
  if (!ok) return;
  const success = await deleteLocation(props.location.id);
  if (success) {
    emit('deleted');
    emit('close');
  }
};
</script>

<template>
  <BottomSheet :open="open" :title="isEdit ? 'Ort bearbeiten' : 'Neuer Ort'" @close="emit('close')">
    <form class="flex flex-col gap-5" @submit.prevent="save">
      <div class="flex items-center gap-3">
        <span class="h-14 w-14 rounded-2xl bg-base-200 flex items-center justify-center text-3xl shrink-0">{{ icon }}</span>
        <input v-model="name" class="input input-lg flex-1 font-medium" placeholder="z. B. Kühlschrank" autocomplete="off" :autofocus="!isEdit" />
      </div>
      <div class="grid grid-cols-5 gap-2">
        <button
          v-for="i in ICONS"
          :key="i"
          type="button"
          class="btn btn-square h-12 w-full text-2xl border-0"
          :class="icon === i ? 'bg-primary/15 ring-2 ring-primary' : 'bg-base-200'"
          @click="icon = i"
        >
          {{ i }}
        </button>
      </div>
      <button type="submit" class="hidden" />
    </form>
    <template #footer>
      <button v-if="isEdit" type="button" class="btn btn-ghost text-error mr-auto gap-1" @click="remove">
        <TrashIcon class="h-5 w-5" /> Löschen
      </button>
      <button type="button" class="btn btn-primary min-w-28" :disabled="!name.trim()" @click="save">
        {{ isEdit ? 'Speichern' : 'Anlegen' }}
      </button>
    </template>
  </BottomSheet>
</template>
