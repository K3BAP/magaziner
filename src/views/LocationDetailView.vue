<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useInventory } from '../composables/useInventory';
import ItemRow from '../components/ItemRow.vue';

// Router übergibt die ID automatisch als Prop
const props = defineProps<{ id: string }>();

const { 
  locations, 
  categories, 
  getItemsByLocation, 
  addCategory, 
  addItem,
  deleteCategory
} = useInventory();

// --- Daten für diesen Ort ---
const selectedLocation = computed(() => locations.value.find(l => l.id === props.id));
const currentLocationData = computed(() => getItemsByLocation(props.id).value);
const currentLocationCategories = computed(() => categories.value.filter(c => c.location_id === props.id));

// --- Modal Logik (Item hinzufügen) ---
const addItemDialog = ref<HTMLDialogElement | null>(null);

// Form Fields
const newItemName = ref('');
const newItemQuantity = ref(1);
const newItemExpiry = ref('');
const newItemMinimumStock = ref<number | null>(null); // NEU
const selectedCategoryId = ref<string | null>(null);
const newCategoryName = ref('');

// NEU: Geöffnet Status
const newItemIsOpened = ref(false);
const newItemOpenedDate = ref('');

// Helper: Wenn Checkbox aktiviert wird, heutiges Datum setzen
watch(newItemIsOpened, (val) => {
  if (val && !newItemOpenedDate.value) {
    newItemOpenedDate.value = new Date().toISOString().split('T')[0];
  }
});

const openAddItemModal = () => {
  // Reset
  newItemName.value = '';
  newItemQuantity.value = 1;
  newItemExpiry.value = '';
  newItemMinimumStock.value = null;
  selectedCategoryId.value = null;
  newCategoryName.value = '';
  newItemIsOpened.value = false;
  newItemOpenedDate.value = '';
  
  addItemDialog.value?.showModal();
};

const onCategorySelect = (id: string) => { 
  selectedCategoryId.value = id; 
  newCategoryName.value = ''; 
};

const onNewCategoryInput = () => { 
  if (newCategoryName.value) selectedCategoryId.value = null; 
  // newItemMinimumStock reset unnötig
};

const handleDeleteCategory = async (catId: string) => {
  const success = await deleteCategory(catId);
  if (success && selectedCategoryId.value === catId) {
    selectedCategoryId.value = null;
  }
};

const saveNewItem = async () => {
  if (!newItemName.value) return;

  try {
    let finalCategoryId = selectedCategoryId.value;
    
    // Falls neue Kategorie erstellt werden soll
    if (newCategoryName.value.trim()) {
      const newCat = await addCategory(newCategoryName.value, props.id);
      if (newCat) finalCategoryId = newCat.id;
    }

    // Item erstellen (inkl. openedAt Parameter)
    await addItem(
      newItemName.value, 
      props.id, 
      finalCategoryId, 
      newItemQuantity.value, 
      newItemExpiry.value,
      newItemIsOpened.value ? newItemOpenedDate.value : null,
      newItemMinimumStock.value // NEU
    );

    addItemDialog.value?.close();
  } catch (e) { 
    alert('Fehler beim Speichern'); 
  }
};
</script>

<template>
  <div v-if="currentLocationData">
    
    <div v-if="currentLocationData.uncategorized.length > 0" class="card bg-base-100 shadow-sm mb-4 overflow-hidden">
      <ItemRow v-for="item in currentLocationData.uncategorized" :key="item.id" :item="item" />
    </div>

    <div v-for="group in currentLocationData.grouped" :key="group.id" class="mb-4">
      <h3 class="font-bold text-sm uppercase text-gray-500 ml-2 mb-2">{{ group.name }}</h3>
      <div class="card bg-base-100 shadow-sm overflow-hidden">
        <ItemRow v-for="item in group.items" :key="item.id" :item="item" />
      </div>
    </div>

    <div v-if="currentLocationData.uncategorized.length === 0 && currentLocationData.grouped.length === 0" class="text-center opacity-50 mt-10">
      Dieser Ort ist leer.
    </div>

    <div class="fixed bottom-6 right-6 z-20">
      <button @click="openAddItemModal" class="btn btn-circle btn-primary btn-lg shadow-xl">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
      </button>
    </div>

    <dialog ref="addItemDialog" class="modal modal-bottom sm:modal-middle">
      <div class="modal-box">
        <h3 class="font-bold text-lg mb-4">Neues Produkt in {{ selectedLocation?.name }}</h3>
        
        <div class="form-control w-full mb-2">
          <label class="label"><span class="label-text font-bold">Name</span></label>
          <input v-model="newItemName" type="text" placeholder="z.B. Milch" class="input input-bordered w-full" autofocus @keyup.enter="saveNewItem"/>
        </div>

        <div class="grid grid-cols-2 gap-4 mb-2">
           <div class="form-control">
             <label class="label"><span class="label-text font-bold">Anzahl</span></label>
             <div class="join">
               <button @click="newItemQuantity > 1 ? newItemQuantity-- : null" class="btn btn-sm join-item">-</button>
               <input v-model="newItemQuantity" type="number" class="input input-bordered input-sm join-item w-full text-center" />
               <button @click="newItemQuantity++" class="btn btn-sm join-item">+</button>
             </div>
           </div>
           <div class="form-control">
             <label class="label"><span class="label-text font-bold">Ablauf</span></label>
             <input v-model="newItemExpiry" type="date" class="input input-bordered input-sm w-full" />
           </div>
        </div>

        <div class="form-control mb-4">
           <label class="label"><span class="label-text font-bold">Mindestbestand</span></label>
           <input v-model="newItemMinimumStock" type="number" min="0" placeholder="Optional (für Einkaufsliste)" class="input input-bordered input-sm w-full" />
        </div>

        <div class="form-control bg-base-200 rounded-lg p-2 mb-4">
           <label class="label cursor-pointer justify-start gap-4">
              <input type="checkbox" v-model="newItemIsOpened" class="checkbox checkbox-sm checkbox-info" />
              <span class="label-text font-bold">Bereits geöffnet?</span>
           </label>
           
           <div v-if="newItemIsOpened" class="mt-2 pl-10">
              <input v-model="newItemOpenedDate" type="date" class="input input-sm input-bordered w-full" />
           </div>
        </div>

        <div class="form-control w-full mb-2">
          <label class="label"><span class="label-text font-bold">Kategorie</span></label>
          
          <div v-if="currentLocationCategories.length > 0" class="flex flex-wrap gap-2 mb-3">
             <div v-for="cat in currentLocationCategories" :key="cat.id" class="join shadow-sm">
                <button 
                  @click="onCategorySelect(cat.id)" 
                  class="btn btn-sm join-item normal-case border-r-0"
                  :class="selectedCategoryId === cat.id ? 'btn-primary' : 'btn-outline border-base-300'"
                  type="button"
                >
                  {{ cat.name }}
                </button>
                <button 
                  @click.stop="handleDeleteCategory(cat.id)"
                  class="btn btn-sm join-item px-2 border-l-0 hover:bg-error hover:text-white hover:border-error transition-colors"
                  :class="selectedCategoryId === cat.id ? 'btn-primary' : 'btn-outline border-base-300'"
                  type="button"
                  title="Kategorie löschen"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
             </div>
          </div>

          <div class="collapse collapse-arrow border border-base-200 bg-base-100 rounded-box">
             <input type="checkbox" :checked="!!newCategoryName" /> 
             <div class="collapse-title text-sm text-gray-500">Oder neu...</div>
             <div class="collapse-content">
               <input v-model="newCategoryName" @input="onNewCategoryInput" type="text" class="input input-bordered input-sm w-full mt-2" />
             </div>
          </div>
        </div>

        <div class="modal-action">
          <form method="dialog"><button class="btn btn-ghost mr-2">Abbrechen</button></form>
          <button @click="saveNewItem" class="btn btn-primary" :disabled="!newItemName">Speichern</button>
        </div>
      </div>
    </dialog>
  </div>
</template>