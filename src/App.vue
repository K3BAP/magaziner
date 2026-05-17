<script setup lang="ts">
import { watch } from 'vue';
import { useAuth } from './composables/useAuth';
import { useInventory } from './composables/useInventory';
import { useTodos } from './composables/useTodos';
import { useShoppingList } from './composables/useShoppingList';
import { useRecipes } from './composables/useRecipes';
import { useFinance } from './composables/useFinance';
import { useHouseholds } from './composables/useHouseholds';
import { useActiveHousehold } from './composables/useActiveHousehold';
import { useRoute } from 'vue-router';
import TheNavbar from './components/layout/TheNavbar.vue';
import TheDrawer from './components/layout/TheDrawer.vue';

const { user, isAuthReady } = useAuth();
const { fetchInventory } = useInventory();
const { fetchTodos } = useTodos();
const { fetchItems: fetchShoppingItems } = useShoppingList();
const { fetchRecipes } = useRecipes();
const { fetchMembers, fetchCategories: fetchFinanceCategories, fetchTransactions } = useFinance();
const { fetchMyHouseholds, clearHouseholds } = useHouseholds();
const { activeHouseholdId } = useActiveHousehold();
const route = useRoute();

const refetchAllData = () => {
  fetchInventory();
  fetchTodos();
  fetchShoppingItems();
  fetchRecipes();
  fetchMembers();
  fetchFinanceCategories();
  fetchTransactions();
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
    } else {
      clearHouseholds();
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

  </div>
</template>
