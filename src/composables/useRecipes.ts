import { ref } from 'vue';
import { supabase } from '../supabase';

export interface Ingredient {
    id: string;
    name: string;
    quantity: string;
}

export interface Recipe {
    id: string;
    user_id?: string;
    name: string;
    image_url: string | null;
    description: string | null;
    ingredients: Ingredient[];
    created_at?: string;
}

const recipes = ref<Recipe[]>([]);
const loading = ref(false);

export function useRecipes() {

    // 1. Fetch Recipes
    const fetchRecipes = async () => {
        try {
            loading.value = true;
            const { data, error } = await supabase
                .from('recipes')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            recipes.value = data || [];
        } catch (error) {
            console.error('Fehler beim Laden der Rezepte:', error);
        } finally {
            loading.value = false;
        }
    };

    // 2. Fetch Single Recipe
    const fetchRecipeById = async (id: string): Promise<Recipe | null> => {
        const { data, error } = await supabase
            .from('recipes')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            console.error('Fehler beim Laden des Rezepts:', error);
            return null;
        }
        return data;
    };

    // 3. Add Recipe
    const addRecipe = async (name: string) => {
        const { data, error } = await supabase
            .from('recipes')
            .insert({
                name,
                ingredients: [],
                description: ''
            })
            .select()
            .single();

        if (error) {
            throw error;
        }

        if (data) {
            recipes.value.unshift(data);
            return data;
        }
    };

    // 4. Update Recipe
    const updateRecipe = async (id: string, updates: Partial<Recipe>) => {
        // Optimistic Update locally
        const index = recipes.value.findIndex(r => r.id === id);
        let oldRecipe: Recipe | null = null;

        if (index !== -1) {
            oldRecipe = { ...recipes.value[index] };
            Object.assign(recipes.value[index], updates);
        }

        const { error } = await supabase
            .from('recipes')
            .update(updates)
            .eq('id', id);

        if (error) {
            console.error('Fehler beim Speichern:', error);
            // Rollback
            if (oldRecipe && index !== -1) {
                recipes.value[index] = oldRecipe;
            }
            throw error;
        }
    };

    // 5. Delete Recipe
    const deleteRecipe = async (id: string) => {
        const prevRecipes = [...recipes.value];
        recipes.value = recipes.value.filter(r => r.id !== id);

        const { error } = await supabase
            .from('recipes')
            .delete()
            .eq('id', id);

        if (error) {
            recipes.value = prevRecipes; // Rollback
            throw error;
        }
    };

    return {
        recipes,
        loading,
        fetchRecipes,
        fetchRecipeById,
        addRecipe,
        updateRecipe,
        deleteRecipe
    };
}
