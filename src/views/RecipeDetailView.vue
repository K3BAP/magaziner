<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useRecipes, type Recipe, type Ingredient } from '../composables/useRecipes';
import { useShoppingList } from '../composables/useShoppingList';

const route = useRoute();
const router = useRouter();
const { fetchRecipeById, updateRecipe, deleteRecipe } = useRecipes();
const { addItem: addToShoppingListStore } = useShoppingList();

const recipeId = route.params.id as string;
const recipe = ref<Recipe | null>(null);
const loading = ref(true);
const isEditing = ref(false);
const isSaving = ref(false);

// Edit State
const editName = ref('');
const editDescription = ref('');
const editImageUrl = ref('');
const editIngredients = ref<Ingredient[]>([]);

// Initialize
const loadRecipe = async () => {
  loading.value = true;
  const data = await fetchRecipeById(recipeId);
  if (!data) {
    alert('Rezept nicht gefunden');
    router.push({ name: 'recipes' });
    return;
  }
  recipe.value = data;
  loading.value = false;

  // Check query param for auto-edit
  if (route.query.edit === 'true') {
     startEditing();
  }
};

onMounted(() => {
  loadRecipe();
});

const startEditing = () => {
  if (!recipe.value) return;
  editName.value = recipe.value.name;
  editDescription.value = recipe.value.description || '';
  editImageUrl.value = recipe.value.image_url || '';
  // Clone ingredients deeply
  editIngredients.value = JSON.parse(JSON.stringify(recipe.value.ingredients || []));
  isEditing.value = true;
};

const cancelEditing = () => {
  isEditing.value = false;
  // Reset query param without reload
  router.replace({ query: {} });
};

// Ingredient Management
const addIngredient = () => {
  editIngredients.value.push({
    id: crypto.randomUUID(),
    name: '',
    quantity: ''
  });
};

const removeIngredient = (index: number) => {
  editIngredients.value.splice(index, 1);
};

// Save
const saveChanges = async () => {
  if (!editName.value.trim()) return;
  
  try {
    isSaving.value = true;
    await updateRecipe(recipeId, {
      name: editName.value,
      description: editDescription.value,
      image_url: editImageUrl.value || null,
      ingredients: editIngredients.value
    });
    
    // Update local view
    if (recipe.value) {
      recipe.value.name = editName.value;
      recipe.value.description = editDescription.value;
      recipe.value.image_url = editImageUrl.value || null;
      recipe.value.ingredients = editIngredients.value; // JSON update
    }
    
    isEditing.value = false;
    router.replace({ query: {} }); // Clear edit param
  } catch (e) {
    alert('Fehler beim Speichern');
  } finally {
    isSaving.value = false;
  }
};

// Delete
const handleDelete = async () => {
  if (!confirm('Möchtest du dieses Rezept wirklich löschen?')) return;
  try {
    await deleteRecipe(recipeId);
    router.push({ name: 'recipes' });
  } catch (e) {
    alert('Fehler beim Löschen');
  }
};

// Shopping List Integration
const addIngredientToShoppingList = async (ing: Ingredient) => {
  const title = ing.quantity ? `${ing.name} (${ing.quantity})` : ing.name;
  await addToShoppingListStore(title);
  // Optional: Feedback (toast) could be added here
};

const addAllIngredientsToShoppingList = async () => {
  if (!recipe.value?.ingredients) return;
  
  if (!confirm(`Möchtest du alle ${recipe.value.ingredients.length} Zutaten auf die Einkaufsliste setzen?`)) return;

  for (const ing of recipe.value.ingredients) {
    await addIngredientToShoppingList(ing);
  }
};

</script>

<template>
  <div v-if="loading" class="flex justify-center py-20">
    <span class="loading loading-spinner loading-lg text-primary"></span>
  </div>

  <div v-else-if="recipe" class="pb-20">
    <!-- Header / Navigation Removed (moved to Navbar) -->

    <!-- VIEW MODE -->
    <div v-if="!isEditing">
      <div class="relative w-full h-64 md:h-80 bg-base-200 rounded-xl overflow-hidden mb-6 shadow-md group">
        <img 
          v-if="recipe.image_url" 
          :src="recipe.image_url" 
          class="w-full h-full object-cover"
          alt="Rezept Bild"
          onerror="this.style.display='none'"
        />
        <div v-else class="w-full h-full flex items-center justify-center text-6xl text-base-content/20">
           🍽️
        </div>
        
        <button @click="startEditing" class="absolute top-4 right-4 btn btn-circle btn-primary shadow-lg opacity-80 hover:opacity-100 group-hover:scale-110 transition-all" title="Bearbeiten">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
        </button>
      </div>

      <h1 class="text-3xl font-bold mb-2">{{ recipe.name }}</h1>
      
      <p v-if="recipe.description" class="text-gray-600 mb-8 whitespace-pre-wrap leading-relaxed">{{ recipe.description }}</p>
      <p v-else class="text-gray-400 italic mb-8">Keine Beschreibung vorhanden.</p>

      <div class="card bg-base-100 border border-base-200 shadow-sm">
        <div class="card-body p-0">
          <div class="p-4 border-b border-base-200 bg-base-50 rounded-t-xl flex justify-between items-center">
             <h3 class="font-bold text-lg flex items-center gap-2">
                🥕 Zutaten
                <span class="badge badge-sm">{{ recipe.ingredients?.length || 0 }}</span>
             </h3>
             <button 
               v-if="recipe.ingredients && recipe.ingredients.length > 0"
               @click="addAllIngredientsToShoppingList" 
               class="btn btn-xs btn-primary btn-outline gap-1"
             >
               Alles auf Einkaufsliste
             </button>
          </div>
          <div class="divide-y divide-base-200">
             <div v-for="ing in recipe.ingredients" :key="ing.id" class="p-3 flex justify-between items-center hover:bg-base-50 group">
                <div>
                  <span class="font-medium">{{ ing.name }}</span>
                  <span class="text-gray-500 ml-2" v-if="ing.quantity">({{ ing.quantity }})</span>
                </div>
                <button 
                  @click="addIngredientToShoppingList(ing)" 
                  class="btn btn-ghost btn-xs btn-square text-primary" 
                  title="Auf Einkaufsliste"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                </button>
             </div>
             <div v-if="!recipe.ingredients || recipe.ingredients.length === 0" class="p-6 text-center text-gray-400">
                Noch keine Zutaten.
             </div>
          </div>
        </div>
      </div>
    </div>

    <!-- EDIT MODE -->
    <div v-else class="max-w-2xl mx-auto bg-base-100 p-6 rounded-xl shadow-lg border border-base-200">
       <h2 class="text-2xl font-bold mb-6 flex items-center justify-between">
         Rezept bearbeiten
         <button @click="handleDelete" class="btn btn-sm btn-ghost text-error" title="Löschen">
           <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
         </button>
       </h2>

       <!-- Basic Info -->
       <div class="form-control mb-4">
         <label class="label font-bold">Name</label>
         <input v-model="editName" type="text" class="input input-bordered w-full" />
       </div>

       <div class="form-control mb-4">
         <label class="label font-bold">Bild URL (Optional)</label>
         <input v-model="editImageUrl" type="text" placeholder="https://..." class="input input-bordered w-full text-sm" />
         <div v-if="editImageUrl" class="mt-2 h-32 w-full rounded-lg overflow-hidden border border-base-300 bg-base-200">
             <img :src="editImageUrl" class="w-full h-full object-cover" onerror="this.style.display='none'" />
         </div>
       </div>

       <div class="form-control mb-8">
         <label class="label font-bold">Beschreibung / Zubereitung</label>
         <textarea v-model="editDescription" class="textarea textarea-bordered h-32 text-base" placeholder="Schritt für Schritt Anleitung..."></textarea>
       </div>

       <!-- Ingredients Editor -->
       <div class="mb-8">
         <div class="flex justify-between items-center mb-2">
            <label class="font-bold">Zutaten</label>
            <button @click="addIngredient" class="btn btn-xs btn-outline btn-primary">+ Zutat</button>
         </div>
         
         <div class="space-y-2">
            <div 
              v-for="(ing, idx) in editIngredients" 
              :key="ing.id" 
              class="flex gap-2 items-center bg-base-100 p-2 rounded-lg border border-base-200"
            >
               <input v-model="ing.name" type="text" placeholder="Zutat (z.B. Mehl)" class="input input-sm input-bordered w-full" />
               <input v-model="ing.quantity" type="text" placeholder="Menge" class="input input-sm input-bordered w-24 text-right" />
               <button @click="removeIngredient(idx)" class="btn btn-ghost btn-xs btn-square text-error">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
               </button>
            </div>
            
            <div v-if="editIngredients.length === 0" class="text-center text-sm text-gray-400 py-4 border border-dashed border-base-300 rounded-lg">
               Keine Zutaten. Klicke auf "+ Zutat".
            </div>
         </div>
       </div>

       <!-- Actions -->
       <div class="flex justify-end gap-3 pt-4 border-t border-base-200">
          <button @click="cancelEditing" class="btn btn-ghost">Abbrechen</button>
          <button @click="saveChanges" class="btn btn-primary min-w-[120px]" :disabled="isSaving">
            <span v-if="isSaving" class="loading loading-spinner loading-xs"></span>
            Speichern
          </button>
       </div>

    </div>

  </div>
</template>
