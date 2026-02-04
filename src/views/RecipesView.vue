<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRecipes } from '../composables/useRecipes';
import { useRouter } from 'vue-router';

const { recipes, fetchRecipes, addRecipe, loading } = useRecipes();
const router = useRouter();

const showAddModal = ref(false);
const newRecipeName = ref('');
const isCreating = ref(false);

onMounted(() => {
  fetchRecipes();
});

const openAddModal = () => {
  newRecipeName.value = '';
  showAddModal.value = true;
};

const handleCreate = async () => {
  if (!newRecipeName.value.trim()) return;
  
  try {
    isCreating.value = true;
    const newRecipe = await addRecipe(newRecipeName.value);
    showAddModal.value = false;
    
    if (newRecipe) {
      // Direkt zum Editieren weiterleiten
      router.push({ name: 'recipe-detail', params: { id: newRecipe.id }, query: { edit: 'true' } });
    }
  } catch (e) {
    alert('Fehler beim Erstellen des Rezepts');
  } finally {
    isCreating.value = false;
  }
};

const navigateToRecipe = (id: string) => {
  router.push({ name: 'recipe-detail', params: { id } });
};
</script>

<template>
  <div>
    <div v-if="loading && recipes.length === 0" class="flex justify-center py-10">
      <span class="loading loading-spinner loading-lg text-primary"></span>
    </div>

    <div v-else-if="recipes.length === 0" class="text-center py-10 opacity-50">
      <div class="text-6xl mb-4">👨‍🍳</div>
      <p>Noch keine Rezepte gespeichert.</p>
      <button @click="openAddModal" class="btn btn-link">Erstelle jetzt dein erstes!</button>
    </div>

    <div v-else class="flex flex-col gap-4 pb-20">
      <div 
        v-for="recipe in recipes" 
        :key="recipe.id" 
        @click="navigateToRecipe(recipe.id)"
        class="card card-side bg-base-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer overflow-hidden group border border-base-200 h-40"
      >
        <figure class="w-1/3 min-w-[33%] bg-base-200 relative h-full">
          <img 
            v-if="recipe.image_url" 
            :src="recipe.image_url" 
            class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
            alt="Rezept Bild" 
            onerror="this.style.display='none'"
          />
          <div v-else class="flex items-center justify-center w-full h-full text-4xl bg-base-200 text-base-content/20">
            🍽️
          </div>
        </figure>
        <div class="card-body w-2/3 p-4 justify-between">
          <div>
            <h2 class="card-title text-lg">{{ recipe.name }}</h2>
            <p class="text-xs text-gray-500 line-clamp-2 mt-1">
              {{ recipe.description || 'Keine Beschreibung' }}
            </p>
          </div>
          <div class="card-actions justify-end">
             <div class="badge badge-outline badge-sm">{{ recipe.ingredients?.length || 0 }} Zutaten</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Floating Action Button -->
    <div class="fixed bottom-6 right-6 z-20">
      <button @click="openAddModal" class="btn btn-circle btn-primary btn-lg shadow-xl">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
      </button>
    </div>

    <!-- Add Modal -->
    <div v-if="showAddModal" class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div class="bg-base-100 p-6 rounded-xl shadow-xl w-full max-w-sm">
        <h3 class="font-bold text-lg mb-4">Neues Rezept</h3>
        <input 
          v-model="newRecipeName" 
          @keyup.enter="handleCreate"
          type="text" 
          placeholder="Name des Gerichts (z.B. Pfannkuchen)" 
          class="input input-bordered w-full mb-4" 
          autofocus
        />
        <div class="flex justify-end gap-2">
          <button @click="showAddModal = false" class="btn btn-ghost">Abbrechen</button>
          <button 
            @click="handleCreate" 
            class="btn btn-primary"
            :disabled="!newRecipeName.trim() || isCreating"
          >
            <span v-if="isCreating" class="loading loading-spinner loading-xs"></span>
            Erstellen
          </button>
        </div>
      </div>
    </div>

  </div>
</template>
