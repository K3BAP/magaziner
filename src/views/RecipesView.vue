<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useRecipes } from '../composables/useRecipes';
import { toast } from '../composables/useToast';
import { searchTerms, normalize } from '../utils/text';
import BottomSheet from '../components/ui/BottomSheet.vue';
import AppFab from '../components/ui/AppFab.vue';
import EmptyState from '../components/ui/EmptyState.vue';
import { PlusIcon, MagnifyingGlassIcon } from '@heroicons/vue/24/outline';

const { recipes, fetchRecipes, addRecipe, loading } = useRecipes();
const router = useRouter();

const showAdd = ref(false);
const newName = ref('');
const creating = ref(false);
const query = ref('');

onMounted(() => {
  if (recipes.value.length === 0) fetchRecipes();
});

const filtered = computed(() => {
  const terms = searchTerms(query.value);
  if (!terms.length) return recipes.value;
  return recipes.value.filter((r) => {
    const hay = normalize(`${r.name} ${(r.ingredients ?? []).map((i) => i.name).join(' ')}`);
    return terms.every((t) => hay.includes(t));
  });
});

const create = async () => {
  if (!newName.value.trim()) return;
  creating.value = true;
  try {
    const r = await addRecipe(newName.value.trim());
    showAdd.value = false;
    if (r) router.push({ name: 'recipe-detail', params: { id: r.id }, query: { edit: 'true' } });
  } catch (e) {
    toast.error('Rezept konnte nicht angelegt werden.', e);
  } finally {
    creating.value = false;
  }
};
</script>

<template>
  <div>
    <label v-if="recipes.length > 4" class="input w-full rounded-full bg-base-100 border-0 mb-4">
      <MagnifyingGlassIcon class="h-5 w-5 opacity-50" />
      <input v-model="query" type="search" placeholder="Rezept oder Zutat suchen" autocomplete="off" />
    </label>

    <div v-if="loading && recipes.length === 0" class="grid grid-cols-2 gap-3">
      <div v-for="i in 4" :key="i" class="skeleton aspect-[4/5] rounded-[1.25rem]" />
    </div>

    <EmptyState
      v-else-if="recipes.length === 0"
      icon="👩‍🍳"
      title="Dein Kochbuch ist leer"
      text="Speichere Lieblingsrezepte mit Zutaten – fehlende Zutaten landen mit einem Tipp auf der Einkaufsliste."
    >
      <button type="button" class="btn btn-primary gap-2" @click="showAdd = true; newName = ''"><PlusIcon class="h-5 w-5" /> Erstes Rezept</button>
    </EmptyState>

    <div v-else class="grid grid-cols-2 gap-3">
      <RouterLink
        v-for="r in filtered"
        :key="r.id"
        :to="{ name: 'recipe-detail', params: { id: r.id } }"
        class="surface pressable overflow-hidden flex flex-col"
      >
        <div class="aspect-[4/3] bg-base-300 overflow-hidden">
          <img v-if="r.image_url" :src="r.image_url" :alt="r.name" class="w-full h-full object-cover" loading="lazy" />
          <div v-else class="w-full h-full flex items-center justify-center text-4xl opacity-30">🍽️</div>
        </div>
        <div class="p-3">
          <div class="font-semibold leading-snug line-clamp-2">{{ r.name }}</div>
          <div class="text-xs text-base-content/55 mt-1">
            {{ r.ingredients?.length || 0 }} Zutaten<template v-if="r.servings"> · {{ r.servings }} Port.</template>
          </div>
        </div>
      </RouterLink>
    </div>
    <EmptyState v-if="recipes.length && !filtered.length" compact icon="🔍" title="Kein Rezept gefunden" />

    <AppFab v-if="recipes.length" label="Rezept" extended @click="showAdd = true; newName = ''">
      <PlusIcon class="h-6 w-6" />
    </AppFab>

    <BottomSheet v-model:open="showAdd" title="Neues Rezept" size="sm">
      <form @submit.prevent="create">
        <input v-model="newName" class="input input-lg w-full" placeholder="z. B. Pfannkuchen" autocomplete="off" autofocus />
      </form>
      <template #footer>
        <button type="button" class="btn btn-ghost" @click="showAdd = false">Abbrechen</button>
        <button type="button" class="btn btn-primary min-w-28" :disabled="!newName.trim() || creating" @click="create">
          <span v-if="creating" class="loading loading-spinner loading-sm" /> Weiter
        </button>
      </template>
    </BottomSheet>
  </div>
</template>
