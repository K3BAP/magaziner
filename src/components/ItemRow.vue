<script setup lang="ts">
import { ref, computed } from 'vue';
import type { Item, ItemInstance } from '../composables/useInventory';
import { useInventory } from '../composables/useInventory';

const props = defineProps<{ item: Item; showLocation?: boolean }>();
const { 
  updateInstanceQuantity, 
  deleteInstance, 
  addInstance, 
  getLocationName, 
  updateItem,     // <--- NEU
  categories      // <--- NEU (für die Auswahl)
} = useInventory();

// --- Logik für Instanzen (Wie vorher) ---
const showAddInstanceDialog = ref(false);
const newInstQty = ref(1);
const newInstDate = ref('');
const confirmDialog = ref<HTMLDialogElement | null>(null);
const instanceToDelete = ref<string | null>(null);

// --- NEU: Logik für Item Bearbeiten ---
const editItemDialog = ref<HTMLDialogElement | null>(null);
const editName = ref('');
const editCategoryId = ref<string | null>(null);

// Verfügbare Kategorien für DIESEN Ort filtern
const availableCategories = computed(() => {
  return categories.value.filter(c => c.location_id === props.item.location_id);
});

const openEditItemModal = () => {
  editName.value = props.item.name;
  editCategoryId.value = props.item.category_id;
  editItemDialog.value?.showModal();
};

const saveItemChanges = async () => {
  if (!editName.value.trim()) return;
  await updateItem(props.item.id, editName.value, editCategoryId.value);
  editItemDialog.value?.close();
};

// --- Helper (Wie vorher) ---
const formatDate = (dateStr: string | null) => {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' });
};

const getExpiryClass = (dateStr: string | null) => {
  if (!dateStr) return 'text-gray-400';
  const today = new Date(); today.setHours(0,0,0,0);
  const expiry = new Date(dateStr);
  const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (86400000));
  if (diffDays < 0) return 'text-error font-bold';
  if (diffDays <= 7) return 'text-warning font-bold';
  return 'text-gray-500';
};

const isExpired = (dateStr: string | null) => {
  if (!dateStr) return false;
  const today = new Date(); today.setHours(0,0,0,0);
  const expiry = new Date(dateStr);
  return expiry.getTime() < today.getTime();
};

// Actions (Wie vorher)
const onAddInstanceClick = () => {
  newInstQty.value = 1;
  newInstDate.value = '';
  showAddInstanceDialog.value = true;
};
const saveNewInstance = async () => {
  await addInstance(props.item.id, newInstQty.value, newInstDate.value);
  showAddInstanceDialog.value = false;
};
const handleDecrement = (inst: ItemInstance) => {
  const newQ = inst.quantity - 1;
  if (newQ <= 0) {
    instanceToDelete.value = inst.id;
    confirmDialog.value?.showModal();
  } else {
    updateInstanceQuantity(props.item.id, inst.id, newQ);
  }
};
const performDelete = () => {
  if (instanceToDelete.value) deleteInstance(props.item.id, instanceToDelete.value);
  confirmDialog.value?.close();
};
const isMultiInstance = computed(() => props.item.instances.length > 1);
</script>

<template>
  <div class="bg-base-100 border-b border-base-200 last:border-0">
    
    <div v-if="!isMultiInstance && item.instances.length > 0" class="flex items-center justify-between p-3">
       <div class="flex-1 min-w-0 pr-2">
          <div @click="openEditItemModal" class="font-medium text-lg truncate cursor-pointer hover:text-primary hover:underline decoration-dashed underline-offset-4 decoration-2">
            {{ item.name }}
          </div>
          
          <div class="flex flex-wrap gap-2 text-xs mt-1">
             <span v-if="showLocation" class="badge badge-ghost badge-sm gap-1">📍 {{ getLocationName(item.location_id) }}</span>
             <span v-if="item.instances[0].expiry_date" :class="getExpiryClass(item.instances[0].expiry_date)" class="flex items-center gap-1">
                {{ isExpired(item.instances[0].expiry_date) ? '⚠️' : '⏳' }} {{ formatDate(item.instances[0].expiry_date) }}
             </span>
          </div>
       </div>

       <div class="flex items-center gap-2">
          <button @click="onAddInstanceClick" class="btn btn-xs btn-circle btn-ghost text-primary" title="Instanz hinzufügen">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
          </button>
          <div class="flex items-center gap-2 bg-base-200 rounded-lg p-1">
             <button @click="handleDecrement(item.instances[0])" class="btn btn-xs btn-square btn-ghost hover:bg-white">-</button>
             <span class="font-bold w-6 text-center text-sm">{{ item.instances[0].quantity }}</span>
             <button @click="updateInstanceQuantity(item.id, item.instances[0].id, item.instances[0].quantity + 1)" class="btn btn-xs btn-square btn-ghost hover:bg-white">+</button>
          </div>
       </div>
    </div>

    <div v-else class="p-3">
       <div class="flex justify-between items-center mb-2">
          <div>
            <div @click="openEditItemModal" class="font-medium text-lg cursor-pointer hover:text-primary hover:underline decoration-dashed underline-offset-4 decoration-2">
              {{ item.name }}
            </div>
            <span v-if="showLocation" class="badge badge-ghost badge-xs">📍 {{ getLocationName(item.location_id) }}</span>
          </div>
          <button @click="onAddInstanceClick" class="btn btn-xs btn-primary btn-outline gap-1">+ Instanz</button>
       </div>

       <div class="flex flex-col gap-2 pl-2 border-l-2 border-base-200">
          <div v-for="inst in item.instances" :key="inst.id" class="flex justify-between items-center text-sm">
             <div :class="getExpiryClass(inst.expiry_date)" class="flex items-center gap-1">
                <span v-if="inst.expiry_date">{{ isExpired(inst.expiry_date) ? '⚠️' : '⏳' }}</span>
                {{ inst.expiry_date ? formatDate(inst.expiry_date) : 'Kein Datum' }}
             </div>
             <div class="flex items-center gap-2 bg-base-200 rounded-lg p-0.5">
                <button @click="handleDecrement(inst)" class="btn btn-xs btn-square btn-ghost hover:bg-white h-6 w-6">-</button>
                <span class="font-bold w-6 text-center">{{ inst.quantity }}</span>
                <button @click="updateInstanceQuantity(item.id, inst.id, inst.quantity + 1)" class="btn btn-xs btn-square btn-ghost hover:bg-white h-6 w-6">+</button>
             </div>
          </div>
       </div>
    </div>

    <dialog ref="editItemDialog" class="modal modal-bottom sm:modal-middle">
      <div class="modal-box">
        <h3 class="font-bold text-lg mb-4">Artikel bearbeiten</h3>
        
        <div class="form-control mb-4">
          <label class="label"><span class="label-text">Name</span></label>
          <input v-model="editName" type="text" class="input input-bordered w-full" />
        </div>

        <div class="form-control mb-6">
          <label class="label"><span class="label-text">Kategorie</span></label>
          <select v-model="editCategoryId" class="select select-bordered w-full">
            <option :value="null">Keine Kategorie</option>
            <option v-for="cat in availableCategories" :key="cat.id" :value="cat.id">
              {{ cat.name }}
            </option>
          </select>
          <div class="label" v-if="!showLocation">
            <span class="label-text-alt text-gray-400">Kategorien des aktuellen Ortes</span>
          </div>
        </div>

        <div class="modal-action">
          <form method="dialog"><button class="btn btn-ghost">Abbrechen</button></form>
          <button @click="saveItemChanges" class="btn btn-primary">Speichern</button>
        </div>
      </div>
    </dialog>

    <div v-if="showAddInstanceDialog" class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
       <div class="bg-base-100 p-4 rounded-xl shadow-xl w-full max-w-xs">
          <h3 class="font-bold mb-3">Neue Instanz</h3>
          <div class="form-control mb-2">
             <label class="label-text text-xs mb-1">Menge</label>
             <input v-model="newInstQty" type="number" min="1" class="input input-sm input-bordered w-full" autofocus />
          </div>
          <div class="form-control mb-4">
             <label class="label-text text-xs mb-1">Ablaufdatum</label>
             <input v-model="newInstDate" type="date" class="input input-sm input-bordered w-full" />
          </div>
          <div class="flex justify-end gap-2">
             <button @click="showAddInstanceDialog = false" class="btn btn-sm btn-ghost">Abbrechen</button>
             <button @click="saveNewInstance" class="btn btn-sm btn-primary">Speichern</button>
          </div>
       </div>
    </div>

    <dialog ref="confirmDialog" class="modal modal-bottom sm:modal-middle">
      <div class="modal-box">
        <h3 class="font-bold text-lg text-error">Aufgebraucht?</h3>
        <p class="py-4">Instanz entfernen?</p>
        <div class="modal-action">
          <form method="dialog"><button class="btn btn-ghost">Nein</button></form>
          <button @click="performDelete" class="btn btn-error">Ja, weg damit</button>
        </div>
      </div>
    </dialog>

  </div>
</template>