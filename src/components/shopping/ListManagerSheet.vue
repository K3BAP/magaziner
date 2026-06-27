<script setup lang="ts">
import { ref, computed } from 'vue';
import draggable from 'vuedraggable';
import { useShoppingLists, type ShoppingList } from '../../composables/useShoppingLists';
import { Bars3Icon, PencilSquareIcon, TrashIcon, PlusIcon, XMarkIcon, CheckIcon } from '@heroicons/vue/24/outline';

defineEmits<{ (e: 'close'): void }>();

const { lists, addList, renameList, deleteList, reorderLists } = useShoppingLists();

// vuedraggable needs a writable model; we persist the new order on change.
const draftOrder = computed<ShoppingList[]>({
  get: () => lists.value,
  set: (val) => { reorderLists(val.map((l) => l.id)); },
});

const editingId = ref<string | null>(null);
const editName = ref('');
const editIcon = ref('');

const startEdit = (list: ShoppingList) => {
  editingId.value = list.id;
  editName.value = list.name;
  editIcon.value = list.icon ?? '';
};
const saveEdit = async () => {
  if (editingId.value && editName.value.trim()) {
    await renameList(editingId.value, editName.value, editIcon.value.trim() || '🛒');
  }
  editingId.value = null;
};

const newName = ref('');
const newIcon = ref('');
const handleAdd = async () => {
  if (!newName.value.trim()) return;
  await addList(newName.value, newIcon.value.trim() || '🛒');
  newName.value = '';
  newIcon.value = '';
};

const handleDelete = async (id: string) => {
  try {
    await deleteList(id);
  } catch (e: any) {
    alert(e?.message ?? 'Liste konnte nicht gelöscht werden.');
  }
};
</script>

<template>
  <div class="modal modal-open modal-bottom sm:modal-middle" @click.self="$emit('close')">
    <div class="modal-box">
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-bold text-lg">Listen verwalten</h3>
        <button class="btn btn-sm btn-ghost btn-circle" @click="$emit('close')"><XMarkIcon class="h-5 w-5" /></button>
      </div>

      <draggable v-model="draftOrder" item-key="id" handle=".drag-handle" :animation="200" tag="div" class="flex flex-col gap-2">
        <template #item="{ element: list }">
          <div class="flex items-center gap-2 p-2 rounded-lg bg-base-200">
            <button class="drag-handle btn btn-xs btn-circle btn-ghost cursor-grab active:cursor-grabbing" title="Verschieben">
              <Bars3Icon class="h-4 w-4" />
            </button>

            <template v-if="editingId === list.id">
              <input v-model="editIcon" class="input input-bordered input-sm w-12 text-center" maxlength="2" />
              <input v-model="editName" class="input input-bordered input-sm flex-1" @keyup.enter="saveEdit" />
              <button class="btn btn-sm btn-circle btn-success" @click="saveEdit"><CheckIcon class="h-4 w-4" /></button>
            </template>
            <template v-else>
              <span class="flex-1 truncate"><span v-if="list.icon" class="mr-1">{{ list.icon }}</span>{{ list.name }}</span>
              <button class="btn btn-xs btn-circle btn-ghost" title="Umbenennen" @click="startEdit(list)"><PencilSquareIcon class="h-4 w-4" /></button>
              <button
                class="btn btn-xs btn-circle btn-ghost text-error"
                title="Löschen"
                :disabled="lists.length <= 1"
                @click="handleDelete(list.id)"
              >
                <TrashIcon class="h-4 w-4" />
              </button>
            </template>
          </div>
        </template>
      </draggable>

      <div class="divider my-3"></div>

      <div class="flex items-center gap-2">
        <input v-model="newIcon" class="input input-bordered input-sm w-12 text-center" placeholder="🛒" maxlength="2" />
        <input v-model="newName" class="input input-bordered input-sm flex-1" placeholder="Neue Liste…" @keyup.enter="handleAdd" />
        <button class="btn btn-sm btn-primary btn-circle" :disabled="!newName.trim()" @click="handleAdd"><PlusIcon class="h-5 w-5" /></button>
      </div>
    </div>
  </div>
</template>
