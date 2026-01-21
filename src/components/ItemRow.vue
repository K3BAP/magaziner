<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { Item, ItemInstance } from '../composables/useInventory';
import { useInventory } from '../composables/useInventory';

const props = defineProps<{ item: Item; showLocation?: boolean }>();
const { 
  // updateInstanceQuantity,  <-- ENTFERNT
  deleteInstance, 
  addInstance, 
  getLocationName, 
  updateItem,     
  categories,
  addCategory,
  updateInstanceDetails // <-- DAS NUTZEN WIR JETZT FÜR ALLES
} = useInventory();

import { useDashboard } from '../composables/useDashboard';
const { isProductPinned, toggleProductPin } = useDashboard();

const isPinned = computed(() => isProductPinned(props.item.id));

// --- Helper: Datum & Status ---
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
  if (diffDays <= 14) return 'text-warning font-bold';
  return 'text-gray-500';
};

const isExpired = (dateStr: string | null) => {
  if (!dateStr) return false;
  const today = new Date(); today.setHours(0,0,0,0);
  const expiry = new Date(dateStr);
  return expiry.getTime() < today.getTime();
};

// --- State: Instanz hinzufügen ---
const showAddInstanceDialog = ref(false);
const newInstQty = ref(1);
const newInstDate = ref('');
const newInstIsOpened = ref(false);
const newInstOpenedDate = ref('');

watch(newInstIsOpened, (val) => {
  if (val && !newInstOpenedDate.value) newInstOpenedDate.value = new Date().toISOString().split('T')[0];
});

const onAddInstanceClick = () => {
  newInstQty.value = 1;
  newInstDate.value = '';
  newInstIsOpened.value = false;
  newInstOpenedDate.value = '';
  showAddInstanceDialog.value = true;
};

const saveNewInstance = async () => {
  await addInstance(
    props.item.id, 
    newInstQty.value, 
    newInstDate.value,
    newInstIsOpened.value ? newInstOpenedDate.value : null
  );
  showAddInstanceDialog.value = false;
};

// --- State: Item Bearbeiten ---
const editItemDialog = ref<HTMLDialogElement | null>(null);
const editName = ref('');
const editCategoryId = ref<string | null>(null);
const editMinimumStock = ref<number | null>(null);
const editNewCategoryName = ref('');
const editIsOpened = ref(false);
const editOpenedDate = ref('');

const availableCategories = computed(() => {
  return categories.value.filter(c => c.location_id === props.item.location_id);
});

const openEditItemModal = () => {
  editName.value = props.item.name;
  editCategoryId.value = props.item.category_id;
  editMinimumStock.value = props.item.minimum_stock;
  editNewCategoryName.value = '';
  
  if (props.item.instances.length > 0) {
    const inst = props.item.instances[0];
    editIsOpened.value = !!inst.opened_at;
    editOpenedDate.value = inst.opened_at || '';
  } else {
    editIsOpened.value = false;
    editOpenedDate.value = '';
  }

  editItemDialog.value?.showModal();
};

watch(editIsOpened, (val) => {
   if (val && !editOpenedDate.value) editOpenedDate.value = new Date().toISOString().split('T')[0];
});

const onEditCategorySelect = (id: string) => {
  if (editCategoryId.value === id) editCategoryId.value = null;
  else editCategoryId.value = id;
  editNewCategoryName.value = '';
};

const onEditNewCategoryInput = () => {
  if (editNewCategoryName.value) editCategoryId.value = null;
};

const saveItemChanges = async () => {
  if (!editName.value.trim()) return;

  let finalCategoryId = editCategoryId.value;
  if (editNewCategoryName.value.trim()) {
    try {
      const newCat = await addCategory(editNewCategoryName.value, props.item.location_id);
      if (newCat) finalCategoryId = newCat.id;
    } catch (e) {
      alert('Fehler beim Erstellen der Kategorie');
      return;
    }
  }

  await updateItem(props.item.id, editName.value, finalCategoryId, editMinimumStock.value);

  if (props.item.instances.length > 0) {
     const inst = props.item.instances[0];
     const newDate = editIsOpened.value ? editOpenedDate.value : null;
     if (inst.opened_at !== newDate) {
        await updateInstanceDetails(props.item.id, inst.id, { 
           opened_at: newDate 
        });
     }
  }

  editItemDialog.value?.close();
};

// --- Löschen Logic ---
const confirmDialog = ref<HTMLDialogElement | null>(null);
const instanceToDelete = ref<string | null>(null);

const handleDecrement = (inst: ItemInstance) => {
  const newQ = inst.quantity - 1;
  if (newQ <= 0) {
    instanceToDelete.value = inst.id;
    confirmDialog.value?.showModal();
  } else {
    // FIX: Hier jetzt updateInstanceDetails nutzen
    updateInstanceDetails(props.item.id, inst.id, { quantity: newQ });
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
          <div class="flex items-center gap-2">
            <div @click="openEditItemModal" class="font-medium text-lg truncate cursor-pointer hover:text-primary hover:underline decoration-dashed underline-offset-4 decoration-2">
              {{ item.name }}
            </div>
            <button 
              @click="toggleProductPin(item.id)" 
              class="btn btn-xs btn-circle"
              :class="isPinned ? 'btn-primary' : 'btn-ghost text-gray-300'"
              title="Auf Dashboard anpinnen"
            >
              📌
            </button>
          </div>
          
          <div class="flex flex-wrap gap-2 text-xs mt-1 items-center">
             <span v-if="showLocation" class="badge badge-ghost badge-sm gap-1">📍 {{ getLocationName(item.location_id) }}</span>
             
             <span v-if="item.instances[0].expiry_date" :class="getExpiryClass(item.instances[0].expiry_date)" class="flex items-center gap-1">
                {{ isExpired(item.instances[0].expiry_date) ? '⚠️' : '⏳' }} {{ formatDate(item.instances[0].expiry_date) }}
             </span>

             <span v-if="item.instances[0].opened_at" class="badge badge-info badge-sm gap-1 text-white border-none">
                🥄 {{ formatDate(item.instances[0].opened_at) }}
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
             <button @click="updateInstanceDetails(item.id, item.instances[0].id, { quantity: item.instances[0].quantity + 1 })" class="btn btn-xs btn-square btn-ghost hover:bg-white">+</button>
          </div>
       </div>
    </div>

    <div v-else class="p-3">
       <div class="flex justify-between items-center mb-2">
          <div>
            <div class="flex items-center gap-2">
              <div @click="openEditItemModal" class="font-medium text-lg cursor-pointer hover:text-primary hover:underline decoration-dashed underline-offset-4 decoration-2">
                {{ item.name }}
              </div>
              <button 
                @click="toggleProductPin(item.id)" 
                class="btn btn-xs btn-circle"
                :class="isPinned ? 'btn-primary' : 'btn-ghost text-gray-300'"
                title="Auf Dashboard anpinnen"
              >
                📌
              </button>
            </div>
            <span v-if="showLocation" class="badge badge-ghost badge-xs">📍 {{ getLocationName(item.location_id) }}</span>
          </div>
          <button @click="onAddInstanceClick" class="btn btn-xs btn-primary btn-outline gap-1">+ Instanz</button>
       </div>

       <div class="flex flex-col gap-2 pl-2 border-l-2 border-base-200">
          <div v-for="inst in item.instances" :key="inst.id" class="flex justify-between items-center text-sm">
             <div class="flex flex-col gap-0.5">
               <div :class="getExpiryClass(inst.expiry_date)" class="flex items-center gap-1">
                  <span v-if="inst.expiry_date">{{ isExpired(inst.expiry_date) ? '⚠️' : '⏳' }}</span>
                  {{ inst.expiry_date ? formatDate(inst.expiry_date) : 'Kein Datum' }}
               </div>
               <div v-if="inst.opened_at" class="text-xs text-info font-medium flex items-center gap-1">
                  🥄 {{ formatDate(inst.opened_at) }}
               </div>
             </div>

             <div class="flex items-center gap-2 bg-base-200 rounded-lg p-0.5">
                <button @click="handleDecrement(inst)" class="btn btn-xs btn-square btn-ghost hover:bg-white h-6 w-6">-</button>
                <span class="font-bold w-6 text-center">{{ inst.quantity }}</span>
                <button @click="updateInstanceDetails(item.id, inst.id, { quantity: inst.quantity + 1 })" class="btn btn-xs btn-square btn-ghost hover:bg-white h-6 w-6">+</button>
             </div>
          </div>
       </div>
    </div>

    <dialog ref="editItemDialog" class="modal modal-bottom sm:modal-middle">
      <div class="modal-box">
        <h3 class="font-bold text-lg mb-4">Artikel bearbeiten</h3>
        
        <div class="form-control mb-4">
          <label class="label"><span class="label-text font-bold">Name</span></label>
          <input v-model="editName" type="text" class="input input-bordered w-full" />
        </div>

        <div class="form-control mb-4">
          <label class="label"><span class="label-text font-bold">Mindestbestand</span></label>
          <input v-model="editMinimumStock" type="number" min="0" placeholder="Optional" class="input input-bordered w-full" />
          <label class="label">
            <span class="label-text-alt text-gray-500">Für die Einkaufsliste.</span>
          </label>
        </div>

        <div class="form-control mb-4">
          <label class="label"><span class="label-text font-bold">Kategorie</span></label>
          <div v-if="availableCategories.length > 0" class="flex flex-wrap gap-2 mb-3">
             <button v-for="cat in availableCategories" :key="cat.id" @click="onEditCategorySelect(cat.id)" class="btn btn-sm normal-case" :class="editCategoryId === cat.id ? 'btn-primary' : 'btn-outline border-base-300'">{{ cat.name }}</button>
          </div>
          <div v-else class="text-xs text-gray-400 mb-2">Keine Kategorien in diesem Ort.</div>
          <div class="collapse collapse-arrow border border-base-200 bg-base-100 rounded-box">
            <input type="checkbox" :checked="!!editNewCategoryName" /> 
            <div class="collapse-title text-sm font-medium text-gray-500">Oder neue Kategorie erstellen...</div>
            <div class="collapse-content">
              <input v-model="editNewCategoryName" @input="onEditNewCategoryInput" type="text" placeholder="Neue Kategorie benennen" class="input input-bordered input-sm w-full mt-2" />
            </div>
          </div>
        </div>

        <div class="form-control bg-base-200 rounded-lg p-2 mb-6" v-if="item.instances.length > 0">
           <label class="label cursor-pointer justify-start gap-4">
              <input type="checkbox" v-model="editIsOpened" class="checkbox checkbox-sm checkbox-info" />
              <span class="label-text font-bold">Bereits geöffnet?</span>
           </label>
           <div v-if="editIsOpened" class="mt-2 pl-10">
              <input v-model="editOpenedDate" type="date" class="input input-sm input-bordered w-full" />
           </div>
           <div class="text-[10px] text-gray-400 mt-1 pl-1">(Gilt für die erste Instanz des Artikels)</div>
        </div>

        <div class="modal-action">
          <form method="dialog"><button class="btn btn-ghost">Abbrechen</button></form>
          <button @click="saveItemChanges" class="btn btn-primary">Speichern</button>
        </div>
      </div>
    </dialog>

    <dialog ref="editItemDialog" class="modal modal-bottom sm:modal-middle" v-if="false"></dialog>

    <div v-if="showAddInstanceDialog" class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
       <div class="bg-base-100 p-4 rounded-xl shadow-xl w-full max-w-xs">
          <h3 class="font-bold mb-3">Neue Instanz hinzufügen</h3>
          <div class="form-control mb-2">
             <label class="label-text text-xs mb-1 font-bold">Menge</label>
             <input v-model="newInstQty" type="number" min="1" class="input input-sm input-bordered w-full" autofocus />
          </div>
          <div class="form-control mb-2">
             <label class="label-text text-xs mb-1 font-bold">Ablaufdatum</label>
             <input v-model="newInstDate" type="date" class="input input-sm input-bordered w-full" />
          </div>
          <div class="form-control bg-base-200 rounded-lg p-2 mb-4">
             <label class="label cursor-pointer justify-start gap-2">
                <input type="checkbox" v-model="newInstIsOpened" class="checkbox checkbox-xs checkbox-info" />
                <span class="label-text text-xs font-bold">Geöffnet?</span>
             </label>
             <div v-if="newInstIsOpened" class="mt-1">
                <input v-model="newInstOpenedDate" type="date" class="input input-xs input-bordered w-full" />
             </div>
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
        <p class="py-4">Möchtest du diese Instanz wirklich entfernen?</p>
        <div class="modal-action">
          <form method="dialog"><button class="btn btn-ghost">Nein</button></form>
          <button @click="performDelete" class="btn btn-error">Ja, weg damit</button>
        </div>
      </div>
    </dialog>
  </div>
</template>