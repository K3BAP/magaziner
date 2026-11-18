<script setup lang="ts">
import { ref, computed, defineAsyncComponent, type Component } from 'vue';
import { useRouter } from 'vue-router';
import draggable from 'vuedraggable';
import { useDashboard, isWidthLocked } from '../composables/useDashboard';
import type { DashboardWidget } from '../composables/useDashboard';
import { useProfile } from '../composables/useProfile';
import { useActiveHousehold } from '../composables/useActiveHousehold';
import { confirmDialog } from '../composables/useConfirm';
import { greeting } from '../utils/date';
import {
  Bars3Icon,
  ArrowsRightLeftIcon,
  XMarkIcon,
  PlusIcon,
  ArrowPathIcon,
  CheckIcon,
  Squares2X2Icon,
} from '@heroicons/vue/24/outline';

import WidgetExpired from '../components/widgets/WidgetExpired.vue';
import WidgetSoonExpired from '../components/widgets/WidgetSoonExpired.vue';
import WidgetOpened from '../components/widgets/WidgetOpened.vue';
import WidgetLowStock from '../components/widgets/WidgetLowStock.vue';
import WidgetTodos from '../components/widgets/WidgetTodos.vue';
import WidgetProduct from '../components/widgets/WidgetProduct.vue';
import WidgetShortcut from '../components/widgets/WidgetShortcut.vue';
import WidgetShoppingList from '../components/widgets/WidgetShoppingList.vue';
import WidgetRecentActivity from '../components/widgets/WidgetRecentActivity.vue';
import WidgetFinanceSnapshot from '../components/widgets/WidgetFinanceSnapshot.vue';
import WidgetQuickAdd from '../components/widgets/WidgetQuickAdd.vue';
import WidgetGallery from '../components/dashboard/WidgetGallery.vue';
import ItemDetailSheet from '../components/inventory/ItemDetailSheet.vue';
import EmptyState from '../components/ui/EmptyState.vue';

// Heavy widgets (Chart.js, the expense wizard) load on demand.
const WIDGET_REGISTRY: Record<string, Component> = {
  expired: WidgetExpired,
  soon: WidgetSoonExpired,
  opened: WidgetOpened,
  'low-stock': WidgetLowStock,
  'inventory-chart': defineAsyncComponent(() => import('../components/widgets/WidgetInventoryChart.vue')),
  'location-chart': defineAsyncComponent(() => import('../components/widgets/WidgetLocationChart.vue')),
  todos: WidgetTodos,
  product: WidgetProduct,
  shortcut: WidgetShortcut,
  'shopping-list': WidgetShoppingList,
  'recent-activity': WidgetRecentActivity,
  'finance-snapshot': WidgetFinanceSnapshot,
  'quick-add': WidgetQuickAdd,
  'quick-expense': defineAsyncComponent(() => import('../components/widgets/WidgetQuickExpense.vue')),
};

const router = useRouter();
const { layout, removeWidget, resetLayout } = useDashboard();
const { profile } = useProfile();
const { activeHousehold } = useActiveHousehold();

const isEditMode = ref(false);
const showGallery = ref(false);
const productDetail = ref<string | null>(null);

const firstName = computed(() => profile.value?.display_name?.trim().split(/\s+/)[0] ?? '');
const today = new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });

const toggleColSpan = (widget: DashboardWidget) => {
  if (isWidthLocked(widget.type)) return;
  widget.colSpan = widget.colSpan === 2 ? 1 : 2;
};

const FILTER_FOR: Record<string, string> = { expired: 'expired', soon: 'soon', opened: 'opened', 'low-stock': 'low' };

const handleWidgetClick = (widget: DashboardWidget) => {
  if (isEditMode.value) return;
  const filter = FILTER_FOR[widget.type];
  if (filter) return router.push({ name: 'allItems', query: { filter } });
  switch (widget.type) {
    case 'todos':
      return router.push({ name: 'todos' });
    case 'shopping-list':
      return router.push({ name: 'shoppingList' });
    case 'inventory-chart':
    case 'location-chart':
      return router.push({ name: 'locations' });
    case 'finance-snapshot':
      return router.push({ name: 'finance' });
    case 'shortcut':
      if (widget.props?.routeName) router.push({ name: widget.props.routeName });
      return;
    case 'product':
      if (widget.props?.productId) productDetail.value = widget.props.productId;
      return;
  }
};

const colSpanClass = (w: DashboardWidget) => (w.colSpan === 2 ? 'col-span-2' : 'col-span-1');

const onConfirmReset = async () => {
  const ok = await confirmDialog({
    title: 'Layout zurücksetzen?',
    message: 'Deine Anpassungen am Dashboard gehen verloren.',
    confirmLabel: 'Zurücksetzen',
    danger: true,
  });
  if (ok) resetLayout();
};
</script>

<template>
  <div class="flex flex-col gap-5">
    <Teleport to="#header-actions" defer>
      <button
        v-if="!isEditMode"
        type="button"
        class="btn btn-ghost btn-circle"
        aria-label="Dashboard anpassen"
        title="Anpassen"
        @click="isEditMode = true"
      >
        <Squares2X2Icon class="h-6 w-6" />
      </button>
    </Teleport>

    <!-- Greeting -->
    <div class="px-1 pt-1">
      <p class="text-sm text-base-content/55 capitalize">{{ today }} · {{ activeHousehold?.name ?? 'Mein Haushalt' }}</p>
      <h2 class="font-display text-3xl mt-0.5">
        {{ greeting() }}<template v-if="firstName">, {{ firstName }}</template>
      </h2>
      <p v-if="isEditMode" class="text-sm text-primary mt-1">Ziehe Widgets am Griff, um sie anzuordnen.</p>
    </div>

    <draggable
      v-model="layout"
      item-key="id"
      handle=".drag-handle"
      :disabled="!isEditMode"
      :animation="200"
      ghost-class="dash-ghost"
      drag-class="dash-drag"
      class="grid grid-cols-2 gap-3"
      tag="div"
    >
      <template #item="{ element: widget }">
        <div
          class="relative h-full"
          :class="[colSpanClass(widget), isEditMode ? 'wiggle' : '']"
        >
          <div class="h-full" :class="isEditMode ? 'pointer-events-none' : ''" @click="handleWidgetClick(widget)">
            <component :is="WIDGET_REGISTRY[widget.type]" v-bind="widget.props" class="h-full" />
          </div>

          <div
            v-if="isEditMode"
            class="absolute top-2 right-2 z-10 flex items-center gap-0.5 rounded-full bg-base-100 px-1 py-1 shadow-md border border-base-300"
          >
            <button class="drag-handle btn btn-sm btn-circle btn-ghost cursor-grab touch-none" title="Verschieben" aria-label="Verschieben" @click.stop>
              <Bars3Icon class="h-4 w-4" />
            </button>
            <button
              v-if="!isWidthLocked(widget.type)"
              class="btn btn-sm btn-circle btn-ghost"
              title="Breite umschalten"
              aria-label="Breite umschalten"
              @click.stop="toggleColSpan(widget)"
            >
              <ArrowsRightLeftIcon class="h-4 w-4" />
            </button>
            <button class="btn btn-sm btn-circle btn-ghost text-error" title="Entfernen" aria-label="Entfernen" @click.stop="removeWidget(widget.id)">
              <XMarkIcon class="h-4 w-4" />
            </button>
          </div>
        </div>
      </template>
    </draggable>

    <EmptyState v-if="layout.length === 0" icon="🧩" title="Dein Dashboard ist leer" text="Stell dir zusammen, was du auf einen Blick sehen willst.">
      <button class="btn btn-primary btn-sm gap-1" @click="showGallery = true"><PlusIcon class="h-4 w-4" /> Widget hinzufügen</button>
    </EmptyState>

    <Teleport to="body">
    <Transition name="slide-up">
      <div v-if="isEditMode" class="edit-bar fixed inset-x-0 z-40 px-4">
        <div class="max-w-md mx-auto flex gap-2 items-center rounded-full bg-base-100 shadow-xl border border-base-300 p-1.5">
          <button class="btn btn-ghost btn-circle" title="Layout zurücksetzen" aria-label="Layout zurücksetzen" @click="onConfirmReset">
            <ArrowPathIcon class="h-5 w-5" />
          </button>
          <button class="btn btn-ghost flex-1 gap-1 rounded-full" @click="showGallery = true"><PlusIcon class="h-5 w-5" /> Widget</button>
          <button class="btn btn-primary flex-1 gap-1 rounded-full" @click="isEditMode = false"><CheckIcon class="h-5 w-5" /> Fertig</button>
        </div>
      </div>
    </Transition>
    </Teleport>

    <WidgetGallery :open="showGallery" @close="showGallery = false" />
    <ItemDetailSheet :item-id="productDetail" @close="productDetail = null" />
  </div>
</template>

<style scoped>
.edit-bar {
  bottom: calc(var(--tabbar-h, 0px) + 0.75rem);
}
.dash-ghost {
  opacity: 0.4;
}
.dash-drag {
  transform: rotate(2deg) scale(1.02);
}
.wiggle {
  animation: wiggle 0.5s ease-in-out infinite alternate;
}
.wiggle:nth-child(2n) {
  animation-delay: 0.15s;
}
@keyframes wiggle {
  from { transform: rotate(-0.4deg); }
  to { transform: rotate(0.4deg); }
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
