<script setup lang="ts">
import { ref, watch } from 'vue';
import BottomSheet from '../ui/BottomSheet.vue';
import { useShoppingList, type ShoppingItem } from '../../composables/useShoppingList';
import { useShoppingCategories } from '../../composables/useShoppingCategories';
import { useShoppingLists } from '../../composables/useShoppingLists';
import { toast } from '../../composables/useToast';
import { TrashIcon } from '@heroicons/vue/24/outline';
import { supabase } from '../../supabase';

const props = defineProps<{ item: ShoppingItem | null }>();
const emit = defineEmits<{ (e: 'close'): void }>();

const { updateItem, deleteItem, items } = useShoppingList();
const { categories } = useShoppingCategories();
const { lists, activeListId } = useShoppingLists();

const title = ref('');
const note = ref('');
const categoryId = ref<string | null>(null);
const listId = ref<string | null>(null);

watch(
  () => props.item,
  (it) => {
    if (!it) return;
    title.value = it.title;
    note.value = it.note ?? '';
    categoryId.value = it.category_id;
    listId.value = it.list_id;
  },
  { immediate: true },
);

const save = async () => {
  const it = props.item;
  if (!it || !title.value.trim()) return;
  const patch: Record<string, any> = {};
  if (title.value.trim() !== it.title) patch.title = title.value;
  if ((note.value.trim() || null) !== (it.note ?? null)) patch.note = note.value.trim() || null;
  if (categoryId.value !== it.category_id) patch.category_id = categoryId.value;
  if (Object.keys(patch).length) await updateItem(it, patch);

  if (listId.value && listId.value !== it.list_id) {
    const { error } = await supabase.from('shopping_list').update({ list_id: listId.value }).eq('id', it.id);
    if (error) toast.error('Eintrag konnte nicht verschoben werden.', error);
    else {
      if (it.list_id === activeListId.value) items.value = items.value.filter((i) => i.id !== it.id);
      toast.success(`Verschoben nach „${lists.value.find((l) => l.id === listId.value)?.name}“`);
    }
  }
  emit('close');
};

const remove = () => {
  if (props.item) deleteItem(props.item);
  emit('close');
};
</script>

<template>
  <BottomSheet :open="!!item" title="Eintrag bearbeiten" @close="emit('close')">
    <form class="flex flex-col gap-4" @submit.prevent="save">
      <label class="flex flex-col gap-1.5">
        <span class="text-sm font-semibold">Was?</span>
        <input v-model="title" class="input w-full" autocomplete="off" enterkeyhint="done" />
      </label>
      <label class="flex flex-col gap-1.5">
        <span class="text-sm font-semibold">Notiz <span class="font-normal text-base-content/50">(Menge, Marke …)</span></span>
        <input v-model="note" class="input w-full" placeholder="z. B. 2 Packungen, laktosefrei" autocomplete="off" />
      </label>

      <div class="flex flex-col gap-1.5">
        <span class="text-sm font-semibold">Regal</span>
        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="cat in categories"
            :key="cat.id"
            type="button"
            class="btn btn-sm rounded-full border-0 gap-1"
            :class="categoryId === cat.id ? 'btn-primary' : 'bg-base-200'"
            @click="categoryId = cat.id"
          >
            <span>{{ cat.icon }}</span>{{ cat.name }}
          </button>
        </div>
      </div>

      <div v-if="lists.length > 1" class="flex flex-col gap-1.5">
        <span class="text-sm font-semibold">Liste</span>
        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="l in lists"
            :key="l.id"
            type="button"
            class="btn btn-sm rounded-full border-0 gap-1"
            :class="listId === l.id ? 'btn-primary' : 'bg-base-200'"
            @click="listId = l.id"
          >
            <span v-if="l.icon">{{ l.icon }}</span>{{ l.name }}
          </button>
        </div>
      </div>
      <button type="submit" class="hidden" />
    </form>

    <template #footer>
      <button type="button" class="btn btn-ghost text-error mr-auto gap-1" @click="remove">
        <TrashIcon class="h-5 w-5" /> Entfernen
      </button>
      <button type="button" class="btn btn-primary min-w-28" :disabled="!title.trim()" @click="save">Speichern</button>
    </template>
  </BottomSheet>
</template>
