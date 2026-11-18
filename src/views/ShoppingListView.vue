<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue';
import { useShoppingList, type ShoppingItem } from '../composables/useShoppingList';
import { useShoppingLists } from '../composables/useShoppingLists';
import { useShoppingCategories } from '../composables/useShoppingCategories';
import { useInventory } from '../composables/useInventory';
import { realtimeStatus } from '../composables/useRealtime';
import ShoppingListRow from '../components/ShoppingListRow.vue';
import ShoppingListTabs from '../components/shopping/ShoppingListTabs.vue';
import ListManagerSheet from '../components/shopping/ListManagerSheet.vue';
import CategoryManagerSheet from '../components/shopping/CategoryManagerSheet.vue';
import ShoppingItemSheet from '../components/shopping/ShoppingItemSheet.vue';
import StockFromShoppingSheet from '../components/shopping/StockFromShoppingSheet.vue';
import EmptyState from '../components/ui/EmptyState.vue';
import SectionHeader from '../components/ui/SectionHeader.vue';
import Skeleton from '../components/ui/Skeleton.vue';
import {
  AdjustmentsHorizontalIcon,
  QueueListIcon,
  TrashIcon,
  ArrowUpIcon,
  ArchiveBoxArrowDownIcon,
  ChevronDownIcon,
} from '@heroicons/vue/24/outline';

const {
  items,
  groupedItems,
  fetchItems,
  addItem,
  loading,
  completedCount,
  deleteCompleted,
  suggestions,
} = useShoppingList();
const { lists, activeList, activeListId, fetchLists } = useShoppingLists();
const { categories, fetchCategories } = useShoppingCategories();
const { items: inventoryItems } = useInventory();

const newItemTitle = ref('');
const input = ref<HTMLInputElement | null>(null);
const showListManager = ref(false);
const showCategoryManager = ref(false);
const showStockSheet = ref(false);
const showCompleted = ref(true);
const editing = ref<ShoppingItem | null>(null);

onMounted(async () => {
  // App.vue already fetches these on login/household-switch, but fetch
  // defensively in case the view is hit directly (deep link / refresh).
  if (categories.value.length === 0) await fetchCategories();
  if (lists.value.length === 0) await fetchLists();
  else await fetchItems();
});

watch(activeListId, () => fetchItems());

// Open entries grouped by aisle; ticked-off ones collect in „Im Wagen“.
const openGroups = computed(() =>
  groupedItems.value
    .map((g) => ({ ...g, items: g.items.filter((i) => !i.is_completed) }))
    .filter((g) => g.items.length > 0),
);
const completedItems = computed(() => items.value.filter((i) => i.is_completed));
const openCount = computed(() => items.value.length - completedCount.value);
const progress = computed(() => (items.value.length ? completedCount.value / items.value.length : 0));
const initialLoading = computed(() => loading.value && items.value.length === 0);

const suggestionList = computed(() =>
  suggestions(newItemTitle.value, inventoryItems.value.map((i) => i.name)),
);

const handleAdd = async (title = newItemTitle.value) => {
  if (!title.trim()) return;
  newItemTitle.value = '';
  await addItem(title);
  nextTick(() => input.value?.focus());
};

const handleClearCompleted = () => deleteCompleted();
</script>

<template>
  <div>
    <Teleport to="#header-actions" defer>
      <button type="button" class="btn btn-ghost btn-circle" aria-label="Regale sortieren" title="Regale sortieren" @click="showCategoryManager = true">
        <AdjustmentsHorizontalIcon class="h-6 w-6" />
      </button>
      <button type="button" class="btn btn-ghost btn-circle" aria-label="Listen verwalten" title="Listen verwalten" @click="showListManager = true">
        <QueueListIcon class="h-6 w-6" />
      </button>
    </Teleport>

    <ShoppingListTabs />

    <!-- Progress -->
    <div v-if="items.length > 0" class="flex items-center gap-3 px-1 mb-4">
      <div class="flex-1 h-1.5 rounded-full bg-base-300 overflow-hidden">
        <div class="h-full bg-primary rounded-full transition-[width] duration-500" :style="{ width: `${progress * 100}%` }" />
      </div>
      <span class="text-xs font-semibold text-base-content/60 tabular-nums">
        {{ openCount === 0 ? 'Alles im Wagen 🎉' : `${openCount} offen` }}
      </span>
      <span
        v-if="realtimeStatus === 'live'"
        class="flex items-center gap-1 text-[11px] font-semibold text-success"
        title="Änderungen anderer Haushaltsmitglieder erscheinen sofort"
      >
        <span class="h-1.5 w-1.5 rounded-full bg-success animate-pulse" /> Live
      </span>
    </div>

    <Skeleton v-if="initialLoading" :rows="5" />

    <template v-else-if="items.length > 0">
      <div class="flex flex-col gap-5">
        <section v-for="group in openGroups" :key="group.id ?? 'misc'">
          <SectionHeader :title="group.name" :icon="group.icon" :count="group.items.length" />
          <div class="surface overflow-hidden">
            <TransitionGroup name="list" tag="div" class="relative divide-y divide-base-200">
              <ShoppingListRow v-for="item in group.items" :key="item.id" :item="item" @edit="editing = $event" />
            </TransitionGroup>
          </div>
        </section>

        <EmptyState
          v-if="openGroups.length === 0"
          compact
          icon="🎉"
          title="Alles erledigt!"
          text="Buche deine Einkäufe in den Vorrat oder räume die Liste auf."
        />

        <section v-if="completedItems.length > 0">
          <SectionHeader title="Im Wagen" :count="completedItems.length">
            <button type="button" class="btn btn-ghost btn-xs gap-1" @click="showCompleted = !showCompleted">
              <ChevronDownIcon class="h-4 w-4 transition-transform" :class="showCompleted ? '' : '-rotate-90'" />
              {{ showCompleted ? 'Einklappen' : 'Anzeigen' }}
            </button>
          </SectionHeader>
          <div v-if="showCompleted" class="surface overflow-hidden mb-3">
            <TransitionGroup name="list" tag="div" class="relative divide-y divide-base-200">
              <ShoppingListRow v-for="item in completedItems" :key="item.id" :item="item" @edit="editing = $event" />
            </TransitionGroup>
          </div>
          <div class="grid grid-cols-2 gap-2">
            <button type="button" class="btn bg-base-100 border-0 gap-2" @click="showStockSheet = true">
              <ArchiveBoxArrowDownIcon class="h-5 w-5" /> In den Vorrat
            </button>
            <button type="button" class="btn bg-base-100 border-0 text-error gap-2" @click="handleClearCompleted">
              <TrashIcon class="h-5 w-5" /> Aufräumen
            </button>
          </div>
        </section>
      </div>
    </template>

    <EmptyState
      v-else
      icon="🛒"
      :title="`„${activeList?.name ?? 'Liste'}“ ist leer`"
      text="Tippe unten, was fehlt. Mit Datum davor („Fr. 21.08. Lachs“) merkst du dir Angebote vor."
    />

    <!-- Add bar: thumb-reachable, above the tab bar and the keyboard. Teleported
         so the page transition's transform can't re-anchor `position: fixed`. -->
    <Teleport to="body">
    <div class="addbar fixed inset-x-0 z-30 px-4 pointer-events-none">
      <div class="mx-auto max-w-2xl pointer-events-auto">
        <div v-if="suggestionList.length" class="flex gap-1.5 overflow-x-auto pb-2 no-scrollbar">
          <button
            v-for="s in suggestionList"
            :key="s"
            type="button"
            class="btn btn-sm rounded-full bg-base-100 border-base-300 shadow-sm shrink-0"
            @mousedown.prevent
            @click="handleAdd(s)"
          >
            + {{ s }}
          </button>
        </div>
        <form
          class="flex items-center gap-2 rounded-full bg-base-100 shadow-lg shadow-base-content/10 border border-base-300 pl-4 pr-1.5 py-1.5"
          @submit.prevent="handleAdd()"
        >
          <input
            ref="input"
            v-model="newItemTitle"
            class="flex-1 min-w-0 bg-transparent outline-none text-base py-1.5"
            placeholder="Was fehlt?"
            autocomplete="off"
            autocapitalize="sentences"
            enterkeyhint="send"
            aria-label="Neuer Eintrag"
          />
          <button type="submit" class="btn btn-primary btn-circle btn-sm h-9 w-9" :disabled="!newItemTitle.trim()" aria-label="Hinzufügen">
            <ArrowUpIcon class="h-5 w-5 stroke-[2.5]" />
          </button>
        </form>
      </div>
    </div>
    </Teleport>

    <ListManagerSheet v-if="showListManager" @close="showListManager = false" />
    <CategoryManagerSheet v-if="showCategoryManager" @close="showCategoryManager = false" />
    <ShoppingItemSheet :item="editing" @close="editing = null" />
    <StockFromShoppingSheet :open="showStockSheet" :entries="completedItems" @close="showStockSheet = false" />
  </div>
</template>

<style scoped>
.addbar {
  bottom: calc(var(--tabbar-h, 0px) + var(--keyboard-inset, 0px) + 0.75rem);
}
.no-scrollbar {
  scrollbar-width: none;
}
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
</style>
