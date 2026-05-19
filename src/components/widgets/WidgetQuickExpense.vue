<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useFinance } from '../../composables/useFinance';
import WidgetShell from './WidgetShell.vue';
import ExpenseWizard from '../finance/ExpenseWizard.vue';

const router = useRouter();
const { members, categories, fetchMembers, fetchCategories } = useFinance();
const showWizard = ref(false);

// Make sure the wizard has its dropdowns populated even if the user lands
// straight on the dashboard without visiting /finance first.
onMounted(() => {
  if (members.value.length === 0) fetchMembers();
  if (categories.value.length === 0) fetchCategories();
});

const onTileClick = () => {
  if (members.value.length === 0) {
    // No household members yet → skip the wizard and send the user to the
    // finance tab where the onboarding member modal lives. We can't capture
    // an expense without at least one payer.
    router.push({ name: 'finance' });
    return;
  }
  showWizard.value = true;
};

// The wizard's "edit categories" / "add member" paths require modals that
// live in FinanceView. Route there and close the wizard so the user lands
// somewhere actionable instead of getting stuck.
const goToFinance = () => {
  showWizard.value = false;
  router.push({ name: 'finance' });
};
</script>

<template>
  <WidgetShell tone="primary" clickable align="center">
    <div
      class="flex-1 flex flex-col items-center justify-center w-full -mt-2"
      @click.stop="onTileClick"
    >
      <div class="text-4xl mb-2">💸</div>
      <div class="font-bold text-base text-center">Neue Ausgabe</div>
    </div>

    <!-- Wizard is mounted alongside the widget so the dashboard doesn't need
         FinanceView to be the active route. Teleport-to-body inside the
         wizard means it overlays the whole screen normally. -->
    <ExpenseWizard
      :open="showWizard"
      @close="showWizard = false"
      @saved="showWizard = false"
      @edit-categories="goToFinance"
      @add-member="goToFinance"
    />
  </WidgetShell>
</template>
