<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useInventory } from '../composables/useInventory';
import { useDashboardStats } from '../composables/useDashboardStats';
import { useDashboard } from '../composables/useDashboard';
import { useTodos } from '../composables/useTodos'; // For checking if data is loaded?
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

// --- Types ---
type WidgetType = 'expired' | 'soon' | 'opened' | 'inventory-chart' | 'location-chart' | 'todos' | 'product' | 'shortcut' | 'shopping-list';

interface DashboardWidget {
  id: string;
  type: WidgetType;
  props?: any;
  colSpan?: 1 | 2; // 1 = half width, 2 = full width
}

const WIDGET_REGISTRY: Record<WidgetType, any> = {
  'expired': WidgetExpired,
  'soon': WidgetSoonExpired,
  'opened': WidgetOpened,
  'inventory-chart': WidgetInventoryChart,
  'location-chart': WidgetLocationChart,
  'todos': WidgetTodos,
  'product': WidgetProduct,
  'shortcut': WidgetShortcut,
  'shopping-list': WidgetShoppingList
};

const DEFAULT_LAYOUT: DashboardWidget[] = [
  { id: 'w1', type: 'expired', colSpan: 1 },
  { id: 'w2', type: 'soon', colSpan: 1 },
  { id: 'w3', type: 'opened', colSpan: 2 },
  { id: 'w4', type: 'inventory-chart', colSpan: 1 },
  { id: 'w5', type: 'todos', colSpan: 1 },
  { id: 'w6', type: 'location-chart', colSpan: 2 },
];

// --- State ---
const router = useRouter();
const { items, locations, fetchInventory } = useInventory(); // items needed for modal details & product picker
const { stats, getExpiryStatus } = useDashboardStats();

const { 
    layout, 
    addWidget: addWidgetCore, 
    removeWidget, 
    moveWidget 
} = useDashboard();

const isEditMode = ref(false);
const showAddModal = ref(false);

// New Widget Form
const newWidgetType = ref<WidgetType>('product');
const newWidgetProduct = ref('');
const newWidgetShortcut = ref<{ title: string; routeName: string; icon: string }>({ title: 'Vorräte', routeName: 'locations', icon: '📦' });

const SHORTCUT_OPTIONS = [
  { title: 'Vorräte', routeName: 'locations', icon: '📦' },
  { title: 'Aufgaben', routeName: 'todos', icon: '✅' },
  { title: 'Einkaufsliste', routeName: 'shoppingList', icon: '🛒' },
  { title: 'Rezepte', routeName: 'recipes', icon: '📖' },
  { title: 'Alle Artikel', routeName: 'allItems', icon: '📋' },
];

// --- Storage & Init ---
onMounted(() => {
  if (items.value.length === 0) fetchInventory();
});

// --- Edit Actions ---
const addWidget = () => {
  if (newWidgetType.value === 'product' && !newWidgetProduct.value) {
    alert('Bitte ein Produkt wählen.');
    return;
  }

  let props = undefined;
  if (newWidgetType.value === 'product') props = { productId: newWidgetProduct.value };
  if (newWidgetType.value === 'shortcut') props = { ...newWidgetShortcut.value };

  addWidgetCore(newWidgetType.value, props);
  
  showAddModal.value = false;
  // Reset
  newWidgetProduct.value = '';
};

const toggleColSpan = (widget: DashboardWidget) => {
    widget.colSpan = widget.colSpan === 2 ? 1 : 2;
};


// --- Modal / Interaction Logic (Reused) ---
// Note: We keep this here because the widgets are "dumb" regarding the app-specific modals 
// (or we would need to pass the open function as prop, but event handling is cleaner).

const detailsDialog = ref<HTMLDialogElement | null>(null);
const detailsTitle = ref('');
const detailsList = ref<{ name: string; date: string; location: string }[]>([]);

const getLocName = (id: string) => locations.value.find(l => l.id === id)?.name || 'Unbekannt';
const formatDate = (d: string) => new Date(d).toLocaleDateString('de-DE');

const handleWidgetClick = (widget: DashboardWidget) => {
  if (isEditMode.value) return;

  if (widget.type === 'expired') openExpiredDetails();
  else if (widget.type === 'soon') openSoonDetails();
  else if (widget.type === 'opened') openOpenedDetails();
  else if (widget.type === 'todos') router.push({ name: 'todos' });
  else if (widget.type === 'shopping-list') router.push({ name: 'shoppingList' });
  else if (widget.type === 'inventory-chart') router.push({ name: 'locations' }); // Requested: Inventory Chart -> Locations
  else if (widget.type === 'shortcut' && widget.props?.routeName) router.push({ name: widget.props.routeName });
  else if (widget.type === 'product' && widget.props?.productId) {
      // Find item to get location? Or just go to full list? 
      // Going to AllItems with query would be nice, but simple fallback:
      router.push({ name: 'allItems' });
  }
};

const openExpiredDetails = () => {
  if (stats.value.expired === 0) return;
  detailsTitle.value = '⚠️ Bereits abgelaufen';
  detailsList.value = [];
  items.value.forEach(item => {
    item.instances.forEach(inst => {
      if (getExpiryStatus(inst.expiry_date) === 'expired') {
        detailsList.value.push({
          name: item.name,
          date: inst.expiry_date ? formatDate(inst.expiry_date) : '?',
          location: getLocName(item.location_id)
        });
      }
    });
  });
  detailsDialog.value?.showModal();
};

const openSoonDetails = () => {
  if (stats.value.soon === 0) return;
  detailsTitle.value = '⏳ Bald fällig (14 Tage)';
  detailsList.value = [];
  items.value.forEach(item => {
    item.instances.forEach(inst => {
      if (getExpiryStatus(inst.expiry_date) === 'soon') {
        detailsList.value.push({
          name: item.name,
          date: inst.expiry_date ? formatDate(inst.expiry_date) : '?',
          location: getLocName(item.location_id)
        });
      }
    });
  });
  detailsDialog.value?.showModal();
};

const openOpenedDetails = () => {
  if (stats.value.opened === 0) return;
  detailsTitle.value = '🥄 Geöffnete Produkte';
  detailsList.value = [];
  items.value.forEach(item => {
    item.instances.forEach(inst => {
      if (inst.opened_at) {
        detailsList.value.push({
          name: item.name,
          date: `Seit: ${formatDate(inst.opened_at)}`,
          location: getLocName(item.location_id)
        });
      }
    });
  });
  detailsList.value.sort((a, b) => a.date.localeCompare(b.date)); // Simple string sort for now
  detailsDialog.value?.showModal();
};

</script>

<template>
  <div class="flex flex-col gap-6 pb-10">
    
    <!-- Header -->
    <div class="flex justify-between items-end">
        <div>
           <h1 class="text-2xl font-bold">Hallo! 👋</h1>
           <p class="text-gray-500">
               {{ isEditMode ? 'Layout anpassen' : 'Hier ist dein aktueller Überblick.' }}
           </p>
        </div>
        <div class="flex gap-2">
            <button 
                v-if="isEditMode" 
                class="btn btn-sm btn-primary"
                @click="showAddModal = true"
            >
                + Widget
            </button>
            <button 
                class="btn btn-sm" 
                :class="isEditMode ? 'btn-active' : 'btn-ghost'"
                @click="isEditMode = !isEditMode"
            >
                {{ isEditMode ? 'Fertig' : '✏️ Anpassen' }}
            </button>
        </div>
    </div>

    <!-- Dashboard Grid -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
       
       <template v-for="(widget, index) in layout" :key="widget.id">
           
           <div 
             class="relative group"
             :class="{
                'col-span-2': widget.colSpan === 2,
                'col-span-1': widget.colSpan !== 2,
                'border-2 border-dashed border-primary/50 rounded-box p-1': isEditMode
             }"
           >
                <!-- Widget Render -->
                <component 
                    :is="WIDGET_REGISTRY[widget.type]" 
                    v-bind="widget.props"
                    class="h-full"
                    @click.stop="handleWidgetClick(widget)"
                />

                <!-- Edit Overlays -->
                <div v-if="isEditMode" class="absolute top-2 right-2 flex gap-1 z-10">
                    <button class="btn btn-xs btn-square btn-ghost bg-base-100 shadow" @click.stop="toggleColSpan(widget)" title="Breite ändern">
                        ↔️
                    </button>
                    <button class="btn btn-xs btn-square btn-ghost bg-base-100 shadow" :disabled="index === 0" @click.stop="moveWidget(index, -1)">
                        ⬆️
                    </button>
                    <button class="btn btn-xs btn-square btn-ghost bg-base-100 shadow" :disabled="index === layout.length - 1" @click.stop="moveWidget(index, 1)">
                        ⬇️
                    </button>
                    <button class="btn btn-xs btn-square btn-error text-white shadow" @click.stop="removeWidget(widget.id)">
                        ✕
                    </button>
                </div>
           </div>

       </template>

    </div>

    <!-- Empty State -->
    <div v-if="layout.length === 0" class="text-center py-10 opacity-50 border-2 dashed border-base-300 rounded-box">
        Keine Widgets. Klicke auf "Anpassen", um welche hinzuzufügen.
    </div>


    <!-- Dialog: Add Widget -->
    <div v-if="showAddModal" class="modal modal-open">
        <div class="modal-box">
            <h3 class="font-bold text-lg">Neues Widget</h3>
            
            <div class="form-control w-full my-4">
                <label class="label"><span class="label-text">Typ</span></label>
                <select class="select select-bordered" v-model="newWidgetType">
                    <option value="expired">⚠️ Abgelaufen</option>
                    <option value="soon">⏳ Bald fällig</option>
                    <option value="opened">🥄 Geöffnet</option>
                    <option value="inventory-chart">📊 Vorräte (Torte)</option>
                    <option value="location-chart">📊 Orte (Balken)</option>
                    <option value="todos">📝 Aufgaben</option>
                    <option value="shopping-list">🛒 Einkaufsliste Widget</option>
                    <option value="shortcut">🔗 Verknüpfung</option>
                    <option value="product">📦 Einzelprodukt</option>
                </select>
            </div>

            <div v-if="newWidgetType === 'shortcut'" class="form-control w-full mb-4">
                 <label class="label"><span class="label-text">Ziel wählen</span></label>
                 <select class="select select-bordered" v-model="newWidgetShortcut">
                     <option v-for="opt in SHORTCUT_OPTIONS" :key="opt.routeName" :value="opt">
                         {{ opt.icon }} {{ opt.title }}
                     </option>
                 </select>
            </div>

            <div v-if="newWidgetType === 'product'" class="form-control w-full mb-4">
                 <label class="label"><span class="label-text">Produkt wählen</span></label>
                 <select class="select select-bordered" v-model="newWidgetProduct">
                     <option disabled value="">Bitte wählen...</option>
                     <option v-for="i in items" :key="i.id" :value="i.id">
                         {{ i.name }} ({{ getLocName(i.location_id) }})
                     </option>
                 </select>
            </div>

            <div class="modal-action">
                <button class="btn btn-ghost" @click="showAddModal = false">Abbrechen</button>
                <button class="btn btn-primary" @click="addWidget">Hinzufügen</button>
            </div>
        </div>
    </div>

    <!-- Dialog: Details List (Legacy Support) -->
    <dialog ref="detailsDialog" class="modal modal-bottom sm:modal-middle">
      <div class="modal-box">
        <h3 class="font-bold text-lg mb-4 sticky top-0 bg-base-100 pt-2">{{ detailsTitle }}</h3>
        
        <div class="flex flex-col gap-2 max-h-[60vh] overflow-y-auto">
           <div v-for="(item, idx) in detailsList" :key="idx" class="flex justify-between items-center p-3 bg-base-200 rounded-lg">
              <div>
                 <div class="font-bold">{{ item.name }}</div>
                 <div class="text-xs opacity-70">📍 {{ item.location }}</div>
              </div>
              <div class="text-sm font-mono bg-base-100 px-2 py-1 rounded border border-base-300">
                 {{ item.date }}
              </div>
           </div>
           
           <div v-if="detailsList.length === 0" class="text-center opacity-50 py-4">
              Keine Einträge.
           </div>
        </div>

        <div class="modal-action">
          <form method="dialog">
            <button class="btn btn-primary">Verstanden</button>
          </form>
        </div>
      </div>
    </dialog>

  </div>
</template>