<script setup lang="ts">
import { watch } from 'vue';
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
import { useRoute } from 'vue-router';
import TheNavbar from './components/layout/TheNavbar.vue';
import TheDrawer from './components/layout/TheDrawer.vue';
import ChangelogModal from './components/ChangelogModal.vue';
import { useChangelog } from './composables/useChangelog';

const { user, isAuthReady } = useAuth();
const { fetchInventory } = useInventory();
const { fetchTodos } = useTodos();
const { fetchItems: fetchShoppingItems, clearItems: clearShoppingItems } = useShoppingList();
const { fetchLists: fetchShoppingLists, clearLists: clearShoppingLists } = useShoppingLists();
const { fetchCategories: fetchShoppingCategories, clearCategories: clearShoppingCategories } = useShoppingCategories();
const { fetchRecipes } = useRecipes();
const { fetchMembers, fetchCategories: fetchFinanceCategories, fetchTransactions } = useFinance();
const { fetchMyHouseholds, clearHouseholds } = useHouseholds();
const { activeHouseholdId } = useActiveHousehold();
const { bootstrap: bootstrapChangelog } = useChangelog();
const route = useRoute();

const refetchAllData = () => {
  fetchInventory();
  fetchTodos();
  fetchRecipes();
  fetchMembers();
  fetchFinanceCategories();
  fetchTransactions();
  refetchShopping();
};

// Shopping needs ordering: aisles and lists first (the latter resolves the
// active list), then the entries of that list.
const refetchShopping = async () => {
  await fetchShoppingCategories();
  await fetchShoppingLists();
  await fetchShoppingItems();
};

// On user login: useAuth has already loaded the profile by the time isAuthReady
// flips true, so we just need to load the household list and then fetch data.
// On logout: clear the household list (data composables get clipped by RLS naturally).
watch(
  [user, isAuthReady],
  async ([u, ready]) => {
    if (!ready) return;
    if (u) {
      await fetchMyHouseholds();
      refetchAllData();
      // On a brand-new install bootstrap silently records the current version;
      // on an existing install where the stored version is older than what
      // we ship now, the modal renders itself via `hasUnseen`.
      bootstrapChangelog();
    } else {
      clearHouseholds();
      clearShoppingItems();
      clearShoppingLists();
      clearShoppingCategories();
    }
  },
  { immediate: true }
);

// When the active household changes (switch, create), re-fetch everything.
// Skip the very first transition from null → initial value (already handled above).
let firstActiveHouseholdResolved = false;
watch(activeHouseholdId, (hid, prev) => {
  if (!firstActiveHouseholdResolved) {
    firstActiveHouseholdResolved = hid !== null;
    return;
  }
  if (hid && hid !== prev) {
    refetchAllData();
  }
});
</script>

<template>
  <div v-if="route.name === 'login'">
    <router-view />
  </div>

  <div v-else class="drawer">
    <input id="main-drawer" type="checkbox" class="drawer-toggle" />

    <div class="drawer-content flex flex-col min-h-screen bg-base-200">
      <TheNavbar />

      <div class="p-4 container mx-auto max-w-md flex-grow">
        <router-view />
      </div>
    </div>

    <TheDrawer />

    <!-- "What's new" pop-up. Renders itself only when the user is on a
         version newer than the one they last acknowledged. -->
    <ChangelogModal />
  </div>
</template>
