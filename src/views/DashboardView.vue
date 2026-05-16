<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import draggable from 'vuedraggable';
import { useInventory } from '../composables/useInventory';
import { useDashboardStats } from '../composables/useDashboardStats';
import { useDashboard, isWidthLocked } from '../composables/useDashboard';
import type { DashboardWidget } from '../composables/useDashboard';
import type { Item } from '../composables/useInventory';
import {
  Bars3Icon,
  ArrowsRightLeftIcon,
  XMarkIcon,
  PencilSquareIcon,
  CheckIcon,
  PlusIcon,
  ArrowPathIcon,
} from '@heroicons/vue/24/outline';

// Widgets
import WidgetExpired from '../components/widgets/WidgetExpired.vue';
import WidgetSoonExpired from '../components/widgets/WidgetSoonExpired.vue';
import WidgetOpened from '../components/widgets/WidgetOpened.vue';
import WidgetInventoryChart from '../components/widgets/WidgetInventoryChart.vue';
import WidgetLocationChart from '../components/widgets/WidgetLocationChart.vue';
import WidgetTodos from '../components/widgets/WidgetTodos.vue';
import WidgetProduct from '../components/widgets/WidgetProduct.vue';
import WidgetShortcut from '../components/widgets/WidgetShortcut.vue';
import WidgetShoppingList from '../components/widgets/WidgetShoppingList.vue';
import WidgetRecentActivity from '../components/widgets/WidgetRecentActivity.vue';
import WidgetFinanceSnapshot from '../components/widgets/WidgetFinanceSnapshot.vue';
import WidgetQuickAdd from '../components/widgets/WidgetQuickAdd.vue';

import WidgetGallery from '../components/dashboard/WidgetGallery.vue';
import ItemRow from '../components/ItemRow.vue';

const WIDGET_REGISTRY: Record<string, any> = {
  'expired': WidgetExpired,
  'soon': WidgetSoonExpired,
  'opened': WidgetOpened,
  'inventory-chart': WidgetInventoryChart,
  'location-chart': WidgetLocationChart,
  'todos': WidgetTodos,
  'product': WidgetProduct,
  'shortcut': WidgetShortcut,
  'shopping-list': WidgetShoppingList,
  'recent-activity': WidgetRecentActivity,
  'finance-snapshot': WidgetFinanceSnapshot,
  'quick-add': WidgetQuickAdd,
};

// --- State ---
const router = useRouter();
const { items, fetchInventory } = useInventory();
const { stats, getExpiryStatus } = useDashboardStats();

const { layout, removeWidget, resetLayout } = useDashboard();

const isEditMode = ref(false);
const showGallery = ref(false);

onMounted(() => {
  if (items.value.length === 0) fetchInventory();
});

const toggleColSpan = (widget: DashboardWidget) => {
  if (isWidthLocked(widget.type)) return;
  widget.colSpan = widget.colSpan === 2 ? 1 : 2;
};

// --- Detail Modal ---
const detailsDialog = ref<HTMLDialogElement | null>(null);
const detailsTitle = ref('');
const detailsItems = ref<Item[]>([]);

const handleWidgetClick = (widget: DashboardWidget) => {
  if (isEditMode.value) return;

  switch (widget.type) {
    case 'expired': return openExpiredDetails();
    case 'soon': return openSoonDetails();
    case 'opened': return openOpenedDetails();
    case 'todos': return router.push({ name: 'todos' });
    case 'shopping-list': return router.push({ name: 'shoppingList' });
    case 'inventory-chart': return router.push({ name: 'locations' });
    case 'location-chart': return router.push({ name: 'locations' });
    case 'finance-snapshot': return router.push({ name: 'finance' });
    case 'shortcut':
      if (widget.props?.routeName) router.push({ name: widget.props.routeName });
      return;
    case 'product':
      if (widget.props?.productId) router.push({ name: 'allItems' });
      return;
  }
};

const openExpiredDetails = () => {
  if (stats.value.expired === 0) return;
  detailsTitle.value = 'Bereits abgelaufen';
  detailsItems.value = items.value.filter(it =>
    it.instances.some(inst => getExpiryStatus(inst.expiry_date) === 'expired')
  );
  detailsDialog.value?.showModal();
};

const openSoonDetails = () => {
  if (stats.value.soon === 0) return;
  detailsTitle.value = 'Bald fällig (14 Tage)';
  detailsItems.value = items.value.filter(it =>
    it.instances.some(inst => getExpiryStatus(inst.expiry_date) === 'soon')
  );
  detailsDialog.value?.showModal();
};

const openOpenedDetails = () => {
  if (stats.value.opened === 0) return;
  detailsTitle.value = 'Geöffnete Produkte';
  detailsItems.value = items.value.filter(it => it.instances.some(inst => !!inst.opened_at));
  detailsDialog.value?.showModal();
};

// Items remaining after the user edits them out of the criteria are auto-removed from the list
const visibleDetailsItems = computed(() =>
  detailsItems.value.filter(it => items.value.some(curr => curr.id === it.id))
);

const colSpanClass = (w: DashboardWidget) => (w.colSpan === 2 ? 'col-span-2' : 'col-span-1');

const onConfirmReset = () => {
  if (confirm('Layout wirklich zurücksetzen? Deine Anpassungen gehen verloren.')) {
    resetLayout();
  }
};
</script>

<template>
  <div class="flex flex-col gap-5 pb-32">

    <!-- Header -->
    <div class="flex justify-between items-end">
      <div>
        <h1 class="text-2xl font-bold">Hallo! 👋</h1>
        <p class="text-base-content/60 text-sm">
          {{ isEditMode ? 'Ziehe Widgets an den Griffen, um sie anzuordnen.' : 'Dein aktueller Überblick.' }}
        </p>
      </div>
      <button
        v-if="!isEditMode"
        class="btn btn-sm btn-ghost gap-1"
        @click="isEditMode = true"
      >
        <PencilSquareIcon class="h-4 w-4" />
        Anpassen
      </button>
    </div>

    <!-- Dashboard Grid (draggable) -->
    <draggable
      v-model="layout"
      item-key="id"
      handle=".drag-handle"
      :disabled="!isEditMode"
      :animation="200"
      ghost-class="dash-ghost"
      drag-class="dash-drag"
      class="grid grid-cols-2 lg:grid-cols-4 gap-4"
      tag="div"
    >
      <template #item="{ element: widget }">
        <div
          class="relative group h-full"
          :class="[
            colSpanClass(widget),
            isEditMode ? 'ring-2 ring-primary/30 rounded-2xl' : ''
          ]"
        >
          <!-- Widget Render -->
          <div
            class="h-full"
            :class="isEditMode ? 'pointer-events-none' : ''"
            @click="handleWidgetClick(widget)"
          >
            <component
              :is="WIDGET_REGISTRY[widget.type]"
              v-bind="widget.props"
              class="h-full"
            />
          </div>

          <!-- Edit Toolbar -->
          <div
            v-if="isEditMode"
            class="absolute top-2 right-2 z-10 flex items-center gap-1 rounded-full bg-base-100/95 backdrop-blur px-1 py-1 shadow-md border border-base-300/60"
          >
            <button
              class="drag-handle btn btn-xs btn-circle btn-ghost cursor-grab active:cursor-grabbing"
              title="Verschieben"
              @click.stop
            >
              <Bars3Icon class="h-4 w-4" />
            </button>
            <button
              v-if="!isWidthLocked(widget.type)"
              class="btn btn-xs btn-circle btn-ghost"
              title="Breite umschalten"
              @click.stop="toggleColSpan(widget)"
            >
              <ArrowsRightLeftIcon class="h-4 w-4" />
            </button>
            <button
              class="btn btn-xs btn-circle btn-ghost text-error hover:bg-error hover:text-error-content"
              title="Entfernen"
              @click.stop="removeWidget(widget.id)"
            >
              <XMarkIcon class="h-4 w-4" />
            </button>
          </div>
        </div>
      </template>
    </draggable>

    <!-- Empty State -->
    <div v-if="layout.length === 0" class="text-center py-10 opacity-60 border-2 border-dashed border-base-300 rounded-2xl">
      <p class="mb-3">Dein Dashboard ist leer.</p>
      <button class="btn btn-sm btn-primary" @click="showGallery = true">
        <PlusIcon class="h-4 w-4" /> Widget hinzufügen
      </button>
    </div>

    <!-- Sticky Edit Toolbar -->
    <Transition name="slide-up">
      <div
        v-if="isEditMode"
        class="fixed bottom-0 inset-x-0 z-30 px-4 pb-4 pt-3 bg-gradient-to-t from-base-100 via-base-100/95 to-transparent"
      >
        <div class="max-w-md mx-auto flex gap-2 items-center">
          <button class="btn btn-ghost btn-square" @click="onConfirmReset" title="Layout zurücksetzen">
            <ArrowPathIcon class="h-5 w-5" />
          </button>
          <button class="btn btn-primary flex-1 gap-1" @click="showGallery = true">
            <PlusIcon class="h-5 w-5" />
            Widget
          </button>
          <button class="btn btn-success flex-1 gap-1" @click="isEditMode = false">
            <CheckIcon class="h-5 w-5" />
            Fertig
          </button>
        </div>
      </div>
    </Transition>

    <!-- Widget Gallery -->
    <WidgetGallery :open="showGallery" @close="showGallery = false" />

    <!-- Detail Modal: actionable item list via ItemRow -->
    <dialog ref="detailsDialog" class="modal modal-bottom sm:modal-middle">
      <div class="modal-box p-0">
        <h3 class="font-bold text-lg px-5 pt-5 pb-3 sticky top-0 bg-base-100 z-10 border-b border-base-200">
          {{ detailsTitle }}
        </h3>

        <div class="max-h-[60vh] overflow-y-auto px-1">
          <div v-if="visibleDetailsItems.length === 0" class="text-center opacity-60 py-8 text-sm">
            Keine Einträge mehr — alles erledigt.
          </div>
          <ItemRow
            v-for="it in visibleDetailsItems"
            :key="it.id"
            :item="it"
            :show-location="true"
          />
        </div>

        <div class="modal-action px-5 pb-5 pt-3 m-0">
          <form method="dialog">
            <button class="btn btn-primary">Fertig</button>
          </form>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button>schließen</button>
      </form>
    </dialog>
  </div>
</template>

<style scoped>
.dash-ghost {
  opacity: 0.4;
}
.dash-drag {
  transform: rotate(2deg) scale(1.02);
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: transform 0.2s ease, opacity 0.2s ease;
}
.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(100%);
  opacity: 0;
}
</style>
