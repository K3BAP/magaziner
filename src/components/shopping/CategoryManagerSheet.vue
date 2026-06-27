<script setup lang="ts">
import { ref, computed } from 'vue';
import draggable from 'vuedraggable';
import { useShoppingCategories, type ShoppingCategory } from '../../composables/useShoppingCategories';
import { Bars3Icon, PencilSquareIcon, TrashIcon, PlusIcon, XMarkIcon, CheckIcon } from '@heroicons/vue/24/outline';

defineEmits<{ (e: 'close'): void }>();

const { categories, addCategory, renameCategory, deleteCategory, reorderCategories } = useShoppingCategories();

const draftOrder = computed<ShoppingCategory[]>({
  get: () => categories.value,
  set: (val) => { reorderCategories(val.map((c) => c.id)); },
});

const editingId = ref<string | null>(null);
const editName = ref('');
const editIcon = ref('');

const startEdit = (cat: ShoppingCategory) => {
  editingId.value = cat.id;
  editName.value = cat.name;
  editIcon.value = cat.icon ?? '';
};
const saveEdit = async () => {
  if (editingId.value && editName.value.trim()) {
    await renameCategory(editingId.value, editName.value, editIcon.value.trim() || '🛒');
  }
  editingId.value = null;
};

const newName = ref('');
const newIcon = ref('');
const handleAdd = async () => {
  if (!newName.value.trim()) return;
  await addCategory(newName.value, newIcon.value.trim() || '🛒');
  newName.value = '';
  newIcon.value = '';
};
</script>

<template>
  <div class="modal modal-open modal-bottom sm:modal-middle" @click.self="$emit('close')">
    <div class="modal-box">
      <div class="flex items-center justify-between mb-1">
        <h3 class="font-bold text-lg">Regale sortieren</h3>
        <button class="btn btn-sm btn-ghost btn-circle" @click="$emit('close')"><XMarkIcon class="h-5 w-5" /></button>
      </div>
      <p class="text-xs text-base-content/60 mb-4">Ziehe die Kategorien in die Reihenfolge deines Supermarkts.</p>

      <draggable v-model="draftOrder" item-key="id" handle=".drag-handle" :animation="200" tag="div" class="flex flex-col gap-2">
        <template #item="{ element: cat }">
          <div class="flex items-center gap-2 p-2 rounded-lg bg-base-200">
            <button class="drag-handle btn btn-xs btn-circle btn-ghost cursor-grab active:cursor-grabbing" title="Verschieben">
              <Bars3Icon class="h-4 w-4" />
            </button>

            <template v-if="editingId === cat.id">
              <input v-model="editIcon" class="input input-bordered input-sm w-12 text-center" maxlength="2" />
              <input v-model="editName" class="input input-bordered input-sm flex-1" @keyup.enter="saveEdit" />
              <button class="btn btn-sm btn-circle btn-success" @click="saveEdit"><CheckIcon class="h-4 w-4" /></button>
            </template>
            <template v-else>
              <span class="flex-1 truncate"><span class="mr-1">{{ cat.icon }}</span>{{ cat.name }}</span>
              <button class="btn btn-xs btn-circle btn-ghost" title="Umbenennen" @click="startEdit(cat)"><PencilSquareIcon class="h-4 w-4" /></button>
              <button class="btn btn-xs btn-circle btn-ghost text-error" title="Löschen" @click="deleteCategory(cat.id)"><TrashIcon class="h-4 w-4" /></button>
            </template>
          </div>
        </template>
      </draggable>

      <div class="divider my-3"></div>

      <div class="flex items-center gap-2">
        <input v-model="newIcon" class="input input-bordered input-sm w-12 text-center" placeholder="🛒" maxlength="2" />
        <input v-model="newName" class="input input-bordered input-sm flex-1" placeholder="Neue Kategorie…" @keyup.enter="handleAdd" />
        <button class="btn btn-sm btn-primary btn-circle" :disabled="!newName.trim()" @click="handleAdd"><PlusIcon class="h-5 w-5" /></button>
      </div>
    </div>
  </div>
</template>
