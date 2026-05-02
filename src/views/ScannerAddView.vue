<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useInventory, type Location } from '../composables/useInventory';
import { QrcodeStream } from 'vue-qrcode-reader';

const router = useRouter();
const { locations, categories, getItemsByLocation, addCategory, addItem } = useInventory();

// --- State ---
const currentStep = ref<1 | 2 | 3 | 4>(1);
const selectedLocationId = ref<string | null>(null);

// Scanner & API
const scannedBarcode = ref<string | null>(null);
const isFetching = ref(false);
const apiError = ref<string | null>(null);

// Item Details Form
const newItemName = ref('');
const newItemQuantity = ref(1);
const newItemExpiry = ref('');
const newItemMinimumStock = ref<number | null>(null);
const selectedCategoryId = ref<string | null>(null);
const newCategoryName = ref('');
const newItemIsOpened = ref(false);
const newItemOpenedDate = ref('');

// Computed
const currentLocation = computed(() => locations.value.find(l => l.id === selectedLocationId.value));
const currentLocationCategories = computed(() => categories.value.filter(c => c.location_id === selectedLocationId.value));

// --- Actions ---

const selectLocation = (locId: string) => {
  selectedLocationId.value = locId;
  currentStep.value = 2; // Gehe zu Schritt 2: Scannen
};

const onDetect = async (detectedCodes: any[]) => {
  if (detectedCodes && detectedCodes.length > 0) {
    const code = detectedCodes[0].rawValue;
    if (code) {
      scannedBarcode.value = code;
      await fetchProductData(code);
    }
  }
};

const fetchProductData = async (barcode: string) => {
  currentStep.value = 3;
  isFetching.value = true;
  apiError.value = null;
  
  try {
    const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
    const data = await res.json();
    
    if (data.status === 1 && data.product) {
      // Produkt gefunden
      newItemName.value = data.product.product_name || '';
      // Optional: Wir könnten hier auch Kategorien versuchen zu matchen, aber lassen wir es vorerst simpel
    } else {
      // Nicht gefunden
      apiError.value = 'Produkt nicht in der Datenbank gefunden. Bitte manuell eingeben.';
      newItemName.value = '';
    }
  } catch (e) {
    apiError.value = 'Fehler beim Abrufen der Produktdaten.';
    newItemName.value = '';
  } finally {
    isFetching.value = false;
    currentStep.value = 4; // Gehe zu Schritt 4: Details eingeben
  }
};

const skipScan = () => {
  // Wenn der Scanner nicht funktioniert oder man doch manuell anlegen will
  scannedBarcode.value = null;
  newItemName.value = '';
  currentStep.value = 4;
};

// Form Helper
watch(newItemIsOpened, (val) => {
  if (val && !newItemOpenedDate.value) {
    newItemOpenedDate.value = new Date().toISOString().split('T')[0];
  }
});

const onCategorySelect = (id: string) => { 
  selectedCategoryId.value = id; 
  newCategoryName.value = ''; 
};

const onNewCategoryInput = () => { 
  if (newCategoryName.value) selectedCategoryId.value = null; 
};

const saveNewItem = async () => {
  if (!newItemName.value || !selectedLocationId.value) return;

  try {
    let finalCategoryId = selectedCategoryId.value;
    
    if (newCategoryName.value.trim()) {
      const newCat = await addCategory(newCategoryName.value, selectedLocationId.value);
      if (newCat) finalCategoryId = newCat.id;
    }

    await addItem(
      newItemName.value, 
      selectedLocationId.value, 
      finalCategoryId, 
      newItemQuantity.value, 
      newItemExpiry.value,
      newItemIsOpened.value ? newItemOpenedDate.value : null,
      newItemMinimumStock.value
    );

    // Erfolgreich gespeichert -> Zurück zum Scan (Step 2)
    newItemName.value = '';
    newItemQuantity.value = 1;
    newItemExpiry.value = '';
    newItemMinimumStock.value = null;
    selectedCategoryId.value = null;
    newCategoryName.value = '';
    newItemIsOpened.value = false;
    newItemOpenedDate.value = '';
    scannedBarcode.value = null;
    
    currentStep.value = 2;
  } catch (e) { 
    alert('Fehler beim Speichern'); 
  }
};

const goBack = () => {
  if (currentStep.value > 1) {
    currentStep.value--;
  } else {
    router.back();
  }
};
</script>

<template>
  <div class="pb-24 max-w-md mx-auto">
    <!-- Header -->
    <div class="flex items-center mb-6">
      <button @click="goBack" class="btn btn-ghost btn-circle mr-2">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
      </button>
      <div>
        <h1 class="text-2xl font-bold">Produkt hinzufügen</h1>
        <div class="text-sm opacity-60">Schritt {{ currentStep }} von 4</div>
      </div>
    </div>

    <!-- Steps Progress -->
    <ul class="steps w-full mb-8 text-xs">
      <li class="step" :class="{ 'step-primary': currentStep >= 1 }">Ort</li>
      <li class="step" :class="{ 'step-primary': currentStep >= 2 }">Scan</li>
      <li class="step" :class="{ 'step-primary': currentStep >= 3 }">API</li>
      <li class="step" :class="{ 'step-primary': currentStep >= 4 }">Details</li>
    </ul>

    <!-- Schritt 1: Ort auswählen -->
    <div v-if="currentStep === 1" class="animate-fade-in">
      <h2 class="text-xl font-bold mb-4">Wo soll das Produkt gelagert werden?</h2>
      
      <div class="grid grid-cols-2 gap-3">
        <button 
          v-for="loc in locations" 
          :key="loc.id"
          @click="selectLocation(loc.id)"
          class="card bg-base-100 shadow-sm hover:shadow-md border border-base-200 active:scale-95 transition-transform p-4 text-center items-center"
        >
          <div class="text-3xl mb-2">{{ loc.icon || '📦' }}</div>
          <div class="font-medium text-sm">{{ loc.name }}</div>
        </button>
      </div>
    </div>

    <!-- Schritt 2: Scanner -->
    <div v-if="currentStep === 2" class="animate-fade-in flex flex-col items-center">
      <h2 class="text-xl font-bold mb-4 text-center">Scanne den Barcode</h2>
      <p class="text-sm opacity-70 mb-4 text-center">Halte die Kamera auf den Strichcode (EAN) des Produkts.</p>
      
      <div class="w-full aspect-square max-w-sm rounded-2xl overflow-hidden shadow-xl bg-black relative mb-6">
        <qrcode-stream @detect="onDetect" :formats="['qr_code', 'ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39']" />
        
        <!-- Overlay Frame -->
        <div class="absolute inset-0 border-[40px] border-black/40 pointer-events-none">
          <div class="w-full h-full border-2 border-primary rounded-lg relative">
             <!-- Corner brackets -->
             <div class="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-primary"></div>
             <div class="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-primary"></div>
             <div class="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-primary"></div>
             <div class="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-primary"></div>
          </div>
        </div>
      </div>
      
      <button @click="skipScan" class="btn btn-ghost w-full">Manuell eintragen (Überspringen)</button>
    </div>

    <!-- Schritt 3: Loading API -->
    <div v-if="currentStep === 3" class="animate-fade-in flex flex-col items-center justify-center py-12">
      <span class="loading loading-spinner loading-lg text-primary mb-4"></span>
      <h2 class="text-xl font-bold">Produktdaten werden abgerufen...</h2>
      <p class="opacity-70 mt-2">Barcode: {{ scannedBarcode }}</p>
    </div>

    <!-- Schritt 4: Details eingeben -->
    <div v-if="currentStep === 4" class="animate-fade-in">
      <h2 class="text-xl font-bold mb-4">Details ergänzen</h2>
      
      <div v-if="apiError" class="alert alert-warning shadow-sm mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
        <span class="text-sm">{{ apiError }}</span>
      </div>

      <div class="card bg-base-100 shadow-sm p-4">
        <div class="form-control w-full mb-4">
          <label class="label"><span class="label-text font-bold">Name</span></label>
          <input v-model="newItemName" type="text" placeholder="z.B. Milch" class="input input-bordered w-full" autofocus/>
        </div>

        <div class="grid grid-cols-2 gap-4 mb-4">
           <div class="form-control">
             <label class="label"><span class="label-text font-bold">Anzahl</span></label>
             <div class="join">
               <button @click="newItemQuantity > 1 ? newItemQuantity-- : null" class="btn join-item">-</button>
               <input v-model="newItemQuantity" type="number" class="input input-bordered join-item w-full text-center" />
               <button @click="newItemQuantity++" class="btn join-item">+</button>
             </div>
           </div>
           <div class="form-control">
             <label class="label"><span class="label-text font-bold">Ablaufdatum</span></label>
             <input v-model="newItemExpiry" type="date" class="input input-bordered w-full" />
           </div>
        </div>

        <div class="form-control mb-4">
           <label class="label"><span class="label-text font-bold">Mindestbestand</span></label>
           <input v-model="newItemMinimumStock" type="number" min="0" placeholder="Optional (für Einkaufsliste)" class="input input-bordered w-full" />
        </div>

        <div class="form-control bg-base-200 rounded-lg p-3 mb-4">
           <label class="label cursor-pointer justify-start gap-4">
              <input type="checkbox" v-model="newItemIsOpened" class="checkbox checkbox-info" />
              <span class="label-text font-bold">Bereits geöffnet?</span>
           </label>
           
           <div v-if="newItemIsOpened" class="mt-2 pl-10">
              <input v-model="newItemOpenedDate" type="date" class="input input-bordered w-full" />
           </div>
        </div>

        <div class="form-control w-full mb-6">
          <label class="label"><span class="label-text font-bold">Kategorie (Optional)</span></label>
          
          <div v-if="currentLocationCategories.length > 0" class="flex flex-wrap gap-2 mb-3">
             <div v-for="cat in currentLocationCategories" :key="cat.id" class="join shadow-sm">
                <button 
                  @click="onCategorySelect(cat.id)" 
                  class="btn btn-sm join-item normal-case"
                  :class="selectedCategoryId === cat.id ? 'btn-primary' : 'btn-outline border-base-300'"
                  type="button"
                >
                  {{ cat.name }}
                </button>
             </div>
          </div>

          <div class="collapse collapse-arrow border border-base-200 bg-base-100 rounded-box">
             <input type="checkbox" :checked="!!newCategoryName" /> 
             <div class="collapse-title text-sm text-gray-500">Neue Kategorie...</div>
             <div class="collapse-content">
               <input v-model="newCategoryName" @input="onNewCategoryInput" type="text" placeholder="Name der neuen Kategorie" class="input input-bordered w-full mt-2" />
             </div>
          </div>
        </div>

        <button @click="saveNewItem" class="btn btn-primary w-full btn-lg" :disabled="!newItemName">
          Produkt Speichern
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
