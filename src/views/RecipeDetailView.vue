<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { useRecipes, type Recipe, type Ingredient } from '../composables/useRecipes';
import { useShoppingList } from '../composables/useShoppingList';
import { useShoppingLists } from '../composables/useShoppingLists';
import { useInventory, totalQuantity } from '../composables/useInventory';
import { usePageTitle } from '../composables/usePageTitle';
import { toast } from '../composables/useToast';
import { confirmDialog } from '../composables/useConfirm';
import { normalize } from '../utils/text';
import { scaleQuantity } from '../utils/scaleQuantity';
import { encodeRecipeImage } from '../utils/image';
import Stepper from '../components/ui/Stepper.vue';
import EmptyState from '../components/ui/EmptyState.vue';
import {
  PencilSquareIcon,
  TrashIcon,
  PlusIcon,
  XMarkIcon,
  CameraIcon,
  ShoppingCartIcon,
  CheckCircleIcon,
} from '@heroicons/vue/24/outline';

const route = useRoute();
const router = useRouter();
const { fetchRecipeById, updateRecipe, deleteRecipe, uploadRecipeImage } = useRecipes();
const { addMany } = useShoppingList();
const { activeList } = useShoppingLists();
const { items: inventory } = useInventory();

const recipeId = route.params.id as string;
const recipe = ref<Recipe | null>(null);
const loading = ref(true);
const isEditing = ref(false);
const isSaving = ref(false);

usePageTitle(() => (isEditing.value ? 'Rezept bearbeiten' : recipe.value?.name ?? null));

// --- Edit state ---
const editName = ref('');
const editDescription = ref('');
const editImageUrl = ref('');
const editServings = ref<number | null>(null);
const editIngredients = ref<Ingredient[]>([]);
const uploading = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);

onMounted(async () => {
  const data = await fetchRecipeById(recipeId);
  loading.value = false;
  if (!data) return;
  recipe.value = { ...data, ingredients: data.ingredients ?? [] };
  servings.value = data.servings ?? 2;
  if (route.query.edit === 'true') startEditing();
});

const parsedDescription = computed(() => {
  if (!recipe.value?.description) return '';
  // Recipes are shared with every household member: never trust the HTML.
  return DOMPurify.sanitize(marked.parse(recipe.value.description, { async: false }) as string);
});

// --- Servings scaling ---
const servings = ref(2);
const baseServings = computed(() => recipe.value?.servings ?? null);
const factor = computed(() => (baseServings.value ? servings.value / baseServings.value : 1));

// --- Inventory check ---
const stockFor = (ing: Ingredient) => {
  const n = normalize(ing.name);
  if (!n) return null;
  const match = inventory.value.find((i) => {
    const m = normalize(i.name);
    return m === n || m.includes(n) || n.includes(m);
  });
  return match && totalQuantity(match) > 0 ? match : null;
};
const missing = computed(() => (recipe.value?.ingredients ?? []).filter((i) => i.name.trim() && !stockFor(i)));

const titleFor = (ing: Ingredient) => {
  const q = scaleQuantity(ing.quantity, factor.value);
  return q ? `${ing.name} (${q})` : ing.name;
};

const addToList = async (list: Ingredient[]) => {
  const n = await addMany(list.map(titleFor));
  if (n > 0) toast.success(`${n} ${n === 1 ? 'Zutat' : 'Zutaten'} auf „${activeList.value?.name ?? 'Einkaufsliste'}“`);
};

// --- Editing ---
const startEditing = () => {
  if (!recipe.value) return;
  editName.value = recipe.value.name;
  editDescription.value = recipe.value.description || '';
  editImageUrl.value = recipe.value.image_url || '';
  editServings.value = recipe.value.servings ?? null;
  editIngredients.value = JSON.parse(JSON.stringify(recipe.value.ingredients || []));
  if (editIngredients.value.length === 0) addIngredient();
  isEditing.value = true;
};

const cancelEditing = () => {
  isEditing.value = false;
  router.replace({ query: {} });
};

const addIngredient = () => {
  editIngredients.value.push({ id: crypto.randomUUID(), name: '', quantity: '' });
};

const onPickImage = async (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  (e.target as HTMLInputElement).value = '';
  if (!file) return;
  uploading.value = true;
  try {
    const blob = await encodeRecipeImage(file);
    editImageUrl.value = await uploadRecipeImage(recipeId, blob);
  } catch (err: any) {
    toast.error(err?.message ?? 'Bild konnte nicht hochgeladen werden.', err);
  } finally {
    uploading.value = false;
  }
};

const saveChanges = async () => {
  if (!editName.value.trim()) return;
  isSaving.value = true;
  try {
    const patch = {
      name: editName.value.trim(),
      description: editDescription.value,
      image_url: editImageUrl.value || null,
      servings: editServings.value && editServings.value > 0 ? Math.round(editServings.value) : null,
      ingredients: editIngredients.value.filter((i) => i.name.trim()),
    };
    await updateRecipe(recipeId, patch);
    if (recipe.value) Object.assign(recipe.value, patch);
    servings.value = patch.servings ?? servings.value;
    isEditing.value = false;
    router.replace({ query: {} });
    toast.success('Rezept gespeichert');
  } catch (e) {
    toast.error('Rezept konnte nicht gespeichert werden.', e);
  } finally {
    isSaving.value = false;
  }
};

const handleDelete = async () => {
  const ok = await confirmDialog({
    title: `„${recipe.value?.name}“ löschen?`,
    confirmLabel: 'Löschen',
    danger: true,
  });
  if (!ok) return;
  try {
    await deleteRecipe(recipeId);
    toast.success('Rezept gelöscht');
    router.replace({ name: 'recipes' });
  } catch (e) {
    toast.error('Rezept konnte nicht gelöscht werden.', e);
  }
};
</script>

<template>
  <div v-if="loading" class="flex flex-col gap-4">
    <div class="skeleton h-56 rounded-3xl" />
    <div class="skeleton h-8 w-2/3 rounded-full" />
    <div class="skeleton h-40 rounded-3xl" />
  </div>

  <EmptyState v-else-if="!recipe" icon="🍽️" title="Rezept nicht gefunden" text="Vielleicht wurde es gelöscht.">
    <button type="button" class="btn btn-primary btn-sm" @click="router.replace({ name: 'recipes' })">Zu den Rezepten</button>
  </EmptyState>

  <div v-else>
    <Teleport v-if="!isEditing" to="#header-actions" defer>
      <button type="button" class="btn btn-ghost btn-circle" aria-label="Rezept bearbeiten" title="Bearbeiten" @click="startEditing">
        <PencilSquareIcon class="h-6 w-6" />
      </button>
    </Teleport>

    <!-- VIEW -->
    <div v-if="!isEditing" class="flex flex-col gap-5">
      <div class="relative w-full aspect-[16/10] rounded-3xl overflow-hidden bg-base-300">
        <img v-if="recipe.image_url" :src="recipe.image_url" class="w-full h-full object-cover" :alt="recipe.name" />
        <div v-else class="w-full h-full flex items-center justify-center text-7xl opacity-30">🍽️</div>
        <div class="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/60 to-transparent">
          <h2 class="font-display text-2xl text-white drop-shadow">{{ recipe.name }}</h2>
        </div>
      </div>

      <!-- Ingredients -->
      <section class="surface overflow-hidden">
        <div class="flex items-center gap-3 px-4 pt-4 pb-3">
          <h3 class="font-semibold flex-1">Zutaten</h3>
          <div v-if="baseServings" class="flex items-center gap-2 text-sm">
            <Stepper :value="servings" size="sm" @dec="servings = Math.max(1, servings - 1)" @inc="servings++" />
            <span class="text-base-content/60">{{ servings === 1 ? 'Portion' : 'Portionen' }}</span>
          </div>
        </div>
        <ul class="divide-y divide-base-200 border-t border-base-200">
          <li v-for="ing in recipe.ingredients" :key="ing.id" class="flex items-center gap-3 pl-4 pr-2 min-h-12">
            <span class="flex-1 min-w-0 py-2">
              <span class="font-medium">{{ ing.name }}</span>
              <span v-if="ing.quantity" class="text-base-content/60"> · {{ scaleQuantity(ing.quantity, factor) }}</span>
              <span v-if="stockFor(ing)" class="flex items-center gap-1 text-xs text-success mt-0.5">
                <CheckCircleIcon class="h-3.5 w-3.5" /> vorrätig
              </span>
            </span>
            <button
              type="button"
              class="btn btn-ghost btn-sm btn-circle text-primary"
              :aria-label="`${ing.name} auf die Einkaufsliste`"
              @click="addToList([ing])"
            >
              <ShoppingCartIcon class="h-5 w-5" />
            </button>
          </li>
          <li v-if="recipe.ingredients.length === 0" class="px-4 py-6 text-center text-sm text-base-content/55">Noch keine Zutaten.</li>
        </ul>
        <div v-if="recipe.ingredients.length" class="grid grid-cols-2 gap-2 p-3 border-t border-base-200">
          <button type="button" class="btn btn-sm btn-primary" :disabled="missing.length === 0" @click="addToList(missing)">
            Fehlende ({{ missing.length }})
          </button>
          <button type="button" class="btn btn-sm bg-base-200 border-0" @click="addToList(recipe.ingredients)">Alle auf die Liste</button>
        </div>
      </section>

      <!-- Preparation -->
      <section class="surface p-5">
        <h3 class="font-semibold mb-2">Zubereitung</h3>
        <div v-if="recipe.description" class="prose-recipe leading-relaxed" v-html="parsedDescription" />
        <p v-else class="text-sm text-base-content/55">Noch keine Beschreibung.</p>
      </section>
    </div>

    <!-- EDIT -->
    <form v-else class="flex flex-col gap-5" @submit.prevent="saveChanges">
      <div class="relative w-full aspect-[16/10] rounded-3xl overflow-hidden bg-base-300">
        <img v-if="editImageUrl" :src="editImageUrl" class="w-full h-full object-cover" alt="" />
        <div v-else class="w-full h-full flex items-center justify-center text-6xl opacity-30">🍽️</div>
        <div class="absolute bottom-3 right-3 flex gap-2">
          <button v-if="editImageUrl" type="button" class="btn btn-sm btn-circle bg-base-100/90 border-0" aria-label="Bild entfernen" @click="editImageUrl = ''">
            <XMarkIcon class="h-4 w-4" />
          </button>
          <button type="button" class="btn btn-sm rounded-full bg-base-100/90 border-0 gap-1" :disabled="uploading" @click="fileInput?.click()">
            <span v-if="uploading" class="loading loading-spinner loading-xs" />
            <CameraIcon v-else class="h-4 w-4" />
            {{ editImageUrl ? 'Foto ändern' : 'Foto hinzufügen' }}
          </button>
        </div>
        <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="onPickImage" />
      </div>

      <div class="surface p-5 flex flex-col gap-4">
        <label class="flex flex-col gap-1.5">
          <span class="text-sm font-semibold">Name</span>
          <input v-model="editName" class="input w-full" required />
        </label>
        <label class="flex flex-col gap-1.5">
          <span class="text-sm font-semibold">Portionen <span class="font-normal text-base-content/50">(zum Umrechnen der Mengen)</span></span>
          <input v-model.number="editServings" type="number" min="1" max="100" inputmode="numeric" class="input w-32" placeholder="z. B. 4" />
        </label>
      </div>

      <div class="surface p-5 flex flex-col gap-3">
        <span class="text-sm font-semibold">Zutaten</span>
        <div v-for="(ing, idx) in editIngredients" :key="ing.id" class="flex gap-2 items-center">
          <input v-model="ing.name" class="input input-sm flex-1 min-w-0" placeholder="Zutat, z. B. Mehl" />
          <input v-model="ing.quantity" class="input input-sm w-24" placeholder="Menge" />
          <button type="button" class="btn btn-ghost btn-sm btn-circle text-base-content/50" aria-label="Zutat entfernen" @click="editIngredients.splice(idx, 1)">
            <XMarkIcon class="h-4 w-4" />
          </button>
        </div>
        <button type="button" class="btn btn-sm btn-ghost self-start gap-1 text-primary" @click="addIngredient">
          <PlusIcon class="h-4 w-4" /> Zutat
        </button>
      </div>

      <div class="surface p-5 flex flex-col gap-1.5">
        <span class="text-sm font-semibold">Zubereitung <span class="font-normal text-base-content/50">(Markdown: **fett**, 1. Liste)</span></span>
        <textarea v-model="editDescription" class="textarea w-full min-h-48 text-base" placeholder="Schritt für Schritt …" />
      </div>

      <div class="flex gap-2">
        <button type="button" class="btn btn-ghost text-error gap-1" @click="handleDelete"><TrashIcon class="h-5 w-5" /> Löschen</button>
        <div class="flex-1" />
        <button type="button" class="btn btn-ghost" @click="cancelEditing">Abbrechen</button>
        <button type="submit" class="btn btn-primary min-w-28" :disabled="isSaving || uploading">
          <span v-if="isSaving" class="loading loading-spinner loading-sm" />
          Speichern
        </button>
      </div>
    </form>
  </div>
</template>

<style scoped>
.prose-recipe :deep(ul) {
  list-style: disc;
  margin: 0 0 1rem 1.25rem;
}
.prose-recipe :deep(ol) {
  list-style: decimal;
  margin: 0 0 1rem 1.25rem;
}
.prose-recipe :deep(li) {
  margin-bottom: 0.35rem;
}
.prose-recipe :deep(h1),
.prose-recipe :deep(h2),
.prose-recipe :deep(h3) {
  font-weight: 700;
  margin: 1.25rem 0 0.5rem;
}
.prose-recipe :deep(p) {
  margin-bottom: 0.85rem;
}
.prose-recipe :deep(a) {
  color: var(--color-primary);
  text-decoration: underline;
}
.prose-recipe :deep(img) {
  border-radius: 1rem;
  max-width: 100%;
}
</style>
