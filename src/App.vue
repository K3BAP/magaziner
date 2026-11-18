<script setup lang="ts">
import { computed, watch, onMounted, onBeforeUnmount } from 'vue';
import { useRoute } from 'vue-router';
import { useAuth } from './composables/useAuth';
import { useInventory } from './composables/useInventory';
import { useTodos } from './composables/useTodos';
import { useShoppingList } from './composables/useShoppingList';
import { useShoppingLists } from './composables/useShoppingLists';
import { useShoppingCategories } from './composables/useShoppingCategories';
import { useRecipes } from './composables/useRecipes';
import { useFinance } from './composables/useFinance';
import { useHouseholds } from './composables/useHouseholds';
import { useActiveHousehold } from './composables/useActiveHousehold';
import { useActivity } from './composables/useActivity';
import { useRealtime } from './composables/useRealtime';
import { useDashboard } from './composables/useDashboard';
import { useChangelog } from './composables/useChangelog';
import { useKeyboardInset } from './composables/useKeyboardInset';
import { useTheme } from './composables/useTheme';
import { useActiveMembers } from './composables/useHouseholdMembers';
import TheAppBar from './components/layout/TheAppBar.vue';
import TheTabBar from './components/layout/TheTabBar.vue';
import ChangelogModal from './components/ChangelogModal.vue';
import ToastHost from './components/ui/ToastHost.vue';
import ConfirmHost from './components/ui/ConfirmHost.vue';
import OfflineBanner from './components/ui/OfflineBanner.vue';

// Track the on-screen keyboard once for the whole app (publishes --keyboard-inset).
useKeyboardInset();
// Applies the saved light/dark/system choice before first paint of the shell.
useTheme();

const route = useRoute();
const { user, isAuthReady } = useAuth();
const inventory = useInventory();
const todos = useTodos();
const shoppingItems = useShoppingList();
const shoppingLists = useShoppingLists();
const shoppingCategories = useShoppingCategories();
const recipes = useRecipes();
const finance = useFinance();
const { fetchMyHouseholds, clearHouseholds } = useHouseholds();
const { activeHouseholdId } = useActiveHousehold();
const activity = useActivity();
const realtime = useRealtime();
const dashboard = useDashboard();
const { bootstrap: bootstrapChangelog } = useChangelog();
const { ensureLoaded: ensureMembers } = useActiveMembers();

const isBare = computed(() => route.meta.layout === 'bare' || (!route.name && !user.value));

// Shopping needs ordering: aisles and lists first (the latter resolves the
// active list), then the entries of that list.
const refetchShopping = async () => {
  await shoppingCategories.fetchCategories();
  await shoppingLists.fetchLists();
  await shoppingItems.fetchItems();
};

const refetchAllData = () => {
  inventory.fetchInventory();
  todos.fetchTodos();
  recipes.fetchRecipes();
  finance.fetchMembers();
  finance.fetchCategories();
  finance.fetchTransactions();
  activity.fetchActivity();
  ensureMembers();
  refetchShopping();
};

const clearAllData = () => {
  inventory.clearInventory();
  todos.clearTodos();
  shoppingItems.clearItems();
  shoppingLists.clearLists();
  shoppingCategories.clearCategories();
  activity.clearActivity();
};

watch(
  [user, isAuthReady],
  async ([u, ready]) => {
    if (!ready) return;
    if (u) {
      await fetchMyHouseholds();
      dashboard.loadLayout();
      refetchAllData();
      realtime.start(activeHouseholdId.value);
      bootstrapChangelog();
    } else {
      realtime.stop();
      clearHouseholds();
      clearAllData();
    }
  },
  { immediate: true },
);

// When the active household changes (switch, create), wipe and re-fetch
// everything so no row of the old household lingers on screen.
let firstActiveHouseholdResolved = false;
watch(activeHouseholdId, (hid, prev) => {
  if (!firstActiveHouseholdResolved) {
    firstActiveHouseholdResolved = hid !== null;
    return;
  }
  if (hid && hid !== prev) {
    clearAllData();
    refetchAllData();
    realtime.start(hid);
  }
});

// Coming back to a backgrounded PWA: the websocket may have been dropped, so
// re-sync once after a longer pause.
let hiddenAt = 0;
const onVisibility = () => {
  if (document.hidden) {
    hiddenAt = Date.now();
    return;
  }
  if (user.value && hiddenAt && Date.now() - hiddenAt > 60_000) {
    refetchAllData();
    realtime.start(activeHouseholdId.value);
  }
  hiddenAt = 0;
};
onMounted(() => document.addEventListener('visibilitychange', onVisibility));
onBeforeUnmount(() => document.removeEventListener('visibilitychange', onVisibility));
</script>

<template>
  <div v-if="isBare" class="min-h-dvh bg-base-200">
    <router-view />
  </div>

  <div v-else class="min-h-dvh bg-base-200 flex flex-col">
    <TheAppBar />
    <OfflineBanner />

    <main class="app-main flex-1 w-full mx-auto max-w-2xl px-4 pt-2">
      <router-view v-slot="{ Component, route: r }">
        <Transition name="page" mode="out-in">
          <component :is="Component" :key="r.name === 'location' || r.name === 'recipe-detail' ? r.fullPath : r.name" />
        </Transition>
      </router-view>
    </main>

    <TheTabBar />
    <ChangelogModal />
  </div>

  <ToastHost />
  <ConfirmHost />
</template>

<style scoped>
.app-main {
  /* Room for the tab bar, a FAB and the keyboard. */
  padding-bottom: calc(var(--tabbar-h, 0px) + 6rem + var(--keyboard-inset, 0px));
}
</style>
