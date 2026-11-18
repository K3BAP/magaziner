<script setup lang="ts">
import { ref, computed } from 'vue';
import BottomSheet from '../ui/BottomSheet.vue';
import { useInventory, type Category } from '../../composables/useInventory';
import { confirmDialog } from '../../composables/useConfirm';
import { PencilSquareIcon, TrashIcon, CheckIcon, PlusIcon } from '@heroicons/vue/24/outline';

const props = defineProps<{ open: boolean; locationId: string }>();
const emit = defineEmits<{ (e: 'close'): void }>();

const { categories, items, addCategory, renameCategory, deleteCategory } = useInventory();

const list = computed(() => categories.value.filter((c) => c.location_id === props.locationId));
const countFor = (id: string) => items.value.filter((i) => i.category_id === id).length;

const editingId = ref<string | null>(null);
const editName = ref('');
const newName = ref('');

const startEdit = (c: Category) => {
  editingId.value = c.id;
  editName.value = c.name;
};
const saveEdit = async () => {
  if (editingId.value) await renameCategory(editingId.value, editName.value);
  editingId.value = null;
};
const remove = async (c: Category) => {
  const n = countFor(c.id);
  const ok = await confirmDialog({
    title: `Kategorie „${c.name}“ löschen?`,
    message: n > 0 ? `${n} ${n === 1 ? 'Produkt bleibt' : 'Produkte bleiben'} erhalten und ${n === 1 ? 'steht' : 'stehen'} danach ohne Kategorie da.` : undefined,
    confirmLabel: 'Löschen',
    danger: true,
  });
  if (ok) await deleteCategory(c.id);
};
const add = async () => {
  if (!newName.value.trim()) return;
  await addCategory(newName.value, props.locationId);
  newName.value = '';
};
</script>

<template>
  <BottomSheet :open="open" title="Kategorien" subtitle="Gruppen innerhalb dieses Orts" @close="emit('close')">
    <div class="flex flex-col gap-2">
      <div v-for="c in list" :key="c.id" class="flex items-center gap-2 rounded-2xl bg-base-200 pl-4 pr-1 py-1 min-h-12">
        <template v-if="editingId === c.id">
          <input v-model="editName" class="input input-sm flex-1" autofocus @keyup.enter="saveEdit" />
          <button type="button" class="btn btn-sm btn-circle btn-primary" aria-label="Speichern" @click="saveEdit">
            <CheckIcon class="h-4 w-4" />
          </button>
        </template>
        <template v-else>
          <span class="flex-1 truncate font-medium">{{ c.name }}</span>
          <span class="text-xs text-base-content/50 mr-1">{{ countFor(c.id) }}</span>
          <button type="button" class="btn btn-sm btn-circle btn-ghost" aria-label="Umbenennen" @click="startEdit(c)">
            <PencilSquareIcon class="h-4 w-4" />
          </button>
          <button type="button" class="btn btn-sm btn-circle btn-ghost text-error" aria-label="Löschen" @click="remove(c)">
            <TrashIcon class="h-4 w-4" />
          </button>
        </template>
      </div>
      <p v-if="list.length === 0" class="text-sm text-base-content/60 py-2">Noch keine Kategorien.</p>
    </div>
    <form class="flex gap-2 mt-4" @submit.prevent="add">
      <input v-model="newName" class="input flex-1" placeholder="Neue Kategorie" autocomplete="off" />
      <button type="submit" class="btn btn-primary btn-square" :disabled="!newName.trim()" aria-label="Anlegen">
        <PlusIcon class="h-5 w-5" />
      </button>
    </form>
  </BottomSheet>
</template>
