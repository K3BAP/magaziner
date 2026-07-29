<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useShoppingList } from '../composables/useShoppingList';
import { useShoppingLists } from '../composables/useShoppingLists';
import { useShoppingCategories } from '../composables/useShoppingCategories';
import ShoppingListRow from '../components/ShoppingListRow.vue';
import ShoppingListTabs from '../components/shopping/ShoppingListTabs.vue';
import ListManagerSheet from '../components/shopping/ListManagerSheet.vue';
import CategoryManagerSheet from '../components/shopping/CategoryManagerSheet.vue';
import { AdjustmentsHorizontalIcon, TrashIcon } from '@heroicons/vue/24/outline';

const { groupedItems, fetchItems, addItem, loading, completedCount, deleteCompleted } = useShoppingList();
const { lists, activeList, activeListId, fetchLists } = useShoppingLists();
const { categories, fetchCategories } = useShoppingCategories();

const newItemTitle = ref('');
const showListManager = ref(false);
const showCategoryManager = ref(false);
const showClearConfirm = ref(false);
const clearing = ref(false);

const completedLabel = computed(() =>
  completedCount.value === 1
    ? 'einen abgehakten Eintrag'
    : `${completedCount.value} abgehakte Einträge`,
);

onMounted(async () => {
  // App.vue already fetches these on login/household-switch, but fetch defensively
  // in case the view is hit directly (deep link / refresh).
  if (lists.value.length === 0) await fetchLists();
  if (categories.value.length === 0) await fetchCategories();
  await fetchItems();
});

// Re-fetch entries whenever the active list changes.
watch(activeListId, () => { fetchItems(); });

const handleAddItem = async () => {
  if (!newItemTitle.value.trim()) return;
  await addItem(newItemTitle.value);
  newItemTitle.value = '';
};

const handleClearCompleted = async () => {
  clearing.value = true;
  await deleteCompleted();
  clearing.value = false;
  showClearConfirm.value = false;
};
</script>

<template>
  <div>
    <ShoppingListTabs @manage="showListManager = true" />

    <div class="join w-full mb-3 shadow-sm">
      <input
        v-model="newItemTitle"
        @keyup.enter="handleAddItem"
        class="input input-bordered join-item w-full"
        placeholder="Neuer Eintrag (z.B. Milch)..."
      />
      <button @click="handleAddItem" class="btn btn-primary join-item">
        Hinzufügen
      </button>
    </div>

    <div class="flex justify-end mb-4">
      <button class="btn btn-xs btn-ghost gap-1" @click="showCategoryManager = true">
        <AdjustmentsHorizontalIcon class="h-4 w-4" /> Regale sortieren
      </button>
    </div>

    <div v-if="loading && groupedItems.length === 0" class="flex justify-center py-4">
      <span class="loading loading-spinner"></span>
    </div>

    <div v-else-if="groupedItems.length > 0" class="flex flex-col gap-4">
      <div v-for="group in groupedItems" :key="group.id ?? 'misc'" class="card bg-base-100 shadow-sm overflow-hidden">
        <div class="flex items-center gap-2 px-4 pt-3 pb-2 text-sm font-semibold text-base-content/60">
          <span class="text-base">{{ group.icon }}</span>
          <span>{{ group.name }}</span>
          <span class="badge badge-ghost badge-sm ml-auto">{{ group.items.length }}</span>
        </div>
        <ShoppingListRow v-for="item in group.items" :key="item.id" :item="item" />
      </div>

      <div v-if="completedCount > 0" class="flex justify-center">
        <button class="btn btn-sm btn-outline btn-error gap-2" @click="showClearConfirm = true">
          <TrashIcon class="h-4 w-4" /> Abgehakte löschen ({{ completedCount }})
        </button>
      </div>
    </div>

    <div v-else class="card bg-base-100 shadow-sm">
      <div class="p-10 text-center opacity-50 flex flex-col items-center gap-2">
        <span class="text-4xl">🛒</span>
        <span>Liste leer!</span>
      </div>
    </div>

    <ListManagerSheet v-if="showListManager" @close="showListManager = false" />
    <CategoryManagerSheet v-if="showCategoryManager" @close="showCategoryManager = false" />

    <!-- Rückfrage vor dem Löschen (position: fixed -> nicht vom Card-Overflow abgeschnitten) -->
    <div
      v-if="showClearConfirm"
      class="modal modal-open modal-bottom sm:modal-middle"
      @click.self="showClearConfirm = false"
    >
      <div class="modal-box">
        <h3 class="font-bold text-lg text-error">Abgehakte löschen?</h3>
        <p class="py-4">
          Damit entfernst du {{ completedLabel }} aus „{{ activeList?.name }}“.
          Das lässt sich nicht rückgängig machen.
        </p>
        <div class="modal-action">
          <button class="btn btn-ghost" @click="showClearConfirm = false">Abbrechen</button>
          <button class="btn btn-error" :disabled="clearing" @click="handleClearCompleted">
            <span v-if="clearing" class="loading loading-spinner loading-xs"></span>
            Ja, löschen
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
