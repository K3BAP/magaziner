import { ref } from 'vue';
import { supabase } from '../supabase';
import { useActiveHousehold } from './useActiveHousehold';
import { DEFAULT_SHOPPING_CATEGORIES, MISC_CATEGORY_KEY } from '../utils/shoppingCategories';

export interface ShoppingCategory {
  id: string;
  household_id: string;
  key: string | null;
  name: string;
  icon: string | null;
  position: number;
  created_at: string;
}

const categories = ref<ShoppingCategory[]>([]);
const loading = ref(false);

export function useShoppingCategories() {
  const { activeHouseholdId } = useActiveHousehold();

  // RLS clips this to the active household, so no explicit filter is needed.
  const fetchCategories = async () => {
    try {
      loading.value = true;
      const { data, error } = await supabase
        .from('shopping_categories')
        .select('*')
        .order('position', { ascending: true });

      if (error) throw error;
      categories.value = data || [];

      // Self-heal: a household that somehow has no aisles (e.g. all deleted)
      // gets the default set back so auto-categorization keeps working.
      if (categories.value.length === 0 && activeHouseholdId.value) {
        await seedDefaults();
      }
    } catch (error) {
      console.error('Fehler beim Laden der Kategorien:', error);
    } finally {
      loading.value = false;
    }
  };

  const seedDefaults = async () => {
    if (!activeHouseholdId.value) return;
    const rows = DEFAULT_SHOPPING_CATEGORIES.map((c) => ({
      household_id: activeHouseholdId.value,
      key: c.key,
      name: c.name,
      icon: c.icon,
      position: c.position,
    }));
    const { data, error } = await supabase
      .from('shopping_categories')
      .insert(rows)
      .select();
    if (error) {
      console.error('Fehler beim Anlegen der Standard-Kategorien:', error);
      return;
    }
    categories.value = (data || []).sort((a, b) => a.position - b.position);
  };

  const addCategory = async (name: string, icon = '🛒'): Promise<ShoppingCategory | null> => {
    const trimmed = name.trim();
    if (!trimmed || !activeHouseholdId.value) return null;

    // New custom aisles slot in just above "Sonstiges" (misc stays last).
    const miscPos = categories.value.find((c) => c.key === MISC_CATEGORY_KEY)?.position;
    const maxPos = categories.value.reduce((m, c) => Math.max(m, c.position), -1);
    const position = miscPos ?? maxPos + 1;

    const { data, error } = await supabase
      .from('shopping_categories')
      .insert({ household_id: activeHouseholdId.value, name: trimmed, icon, position })
      .select()
      .single();

    if (error || !data) {
      console.error('Fehler beim Anlegen der Kategorie:', error);
      return null;
    }
    categories.value.push(data);
    categories.value.sort((a, b) => a.position - b.position);
    return data;
  };

  const renameCategory = async (id: string, name: string, icon?: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const cat = categories.value.find((c) => c.id === id);
    if (!cat) return;
    const prevName = cat.name;
    const prevIcon = cat.icon;
    cat.name = trimmed;
    if (icon !== undefined) cat.icon = icon;

    const payload: { name: string; icon?: string } = { name: trimmed };
    if (icon !== undefined) payload.icon = icon;
    const { error } = await supabase.from('shopping_categories').update(payload).eq('id', id);
    if (error) {
      cat.name = prevName;
      cat.icon = prevIcon;
      console.error('Fehler beim Umbenennen der Kategorie:', error);
    }
  };

  const deleteCategory = async (id: string) => {
    const prev = [...categories.value];
    categories.value = categories.value.filter((c) => c.id !== id);
    // shopping_list.category_id is ON DELETE SET NULL, so entries just fall back
    // to the "Sonstiges" bucket — no orphaned rows.
    const { error } = await supabase.from('shopping_categories').delete().eq('id', id);
    if (error) {
      categories.value = prev;
      console.error('Fehler beim Löschen der Kategorie:', error);
    }
  };

  // Persist a new aisle order (drag & drop). Reassigns positions 0..n-1.
  const reorderCategories = async (orderedIds: string[]) => {
    const prev = categories.value.map((c) => ({ id: c.id, position: c.position }));

    orderedIds.forEach((id, idx) => {
      const cat = categories.value.find((c) => c.id === id);
      if (cat) cat.position = idx;
    });
    categories.value.sort((a, b) => a.position - b.position);

    const results = await Promise.all(
      orderedIds.map((id, idx) =>
        supabase.from('shopping_categories').update({ position: idx }).eq('id', id),
      ),
    );
    const failed = results.find((r) => r.error);
    if (failed) {
      console.error('Fehler beim Sortieren der Kategorien:', failed.error);
      prev.forEach((p) => {
        const cat = categories.value.find((c) => c.id === p.id);
        if (cat) cat.position = p.position;
      });
      categories.value.sort((a, b) => a.position - b.position);
    }
  };

  const categoryById = (id: string | null) =>
    id ? categories.value.find((c) => c.id === id) ?? null : null;

  const categoryByKey = (key: string) => categories.value.find((c) => c.key === key) ?? null;

  const clearCategories = () => {
    categories.value = [];
  };

  return {
    categories,
    loading,
    fetchCategories,
    addCategory,
    renameCategory,
    deleteCategory,
    reorderCategories,
    categoryById,
    categoryByKey,
    clearCategories,
  };
}
