import { ref, computed } from 'vue';
import { supabase } from '../supabase';
import { useActiveHousehold } from './useActiveHousehold';
import { useShoppingCategories } from './useShoppingCategories';

export interface ShoppingList {
  id: string;
  household_id: string;
  name: string;
  icon: string | null;
  position: number;
  created_at: string;
}

const lists = ref<ShoppingList[]>([]);
const activeListId = ref<string | null>(null);
const loading = ref(false);

function storageKey(householdId: string) {
  return `active_shopping_list_${householdId}`;
}

export function useShoppingLists() {
  const { activeHouseholdId } = useActiveHousehold();
  const { fetchCategories, categories } = useShoppingCategories();

  const activeList = computed(
    () => lists.value.find((l) => l.id === activeListId.value) ?? null,
  );

  // Restore the per-user list selection for this household from localStorage,
  // falling back to the first (lowest-position) list.
  const restoreActiveList = () => {
    if (!activeHouseholdId.value || lists.value.length === 0) {
      activeListId.value = null;
      return;
    }
    const stored = localStorage.getItem(storageKey(activeHouseholdId.value));
    const valid = stored && lists.value.some((l) => l.id === stored);
    activeListId.value = valid ? stored : lists.value[0].id;
  };

  // RLS clips this to the active household, so no explicit filter is needed.
  const fetchLists = async () => {
    try {
      loading.value = true;
      const { data, error } = await supabase
        .from('shopping_lists')
        .select('*')
        .order('position', { ascending: true });

      if (error) throw error;
      lists.value = data || [];

      // A household with no lists (brand-new, or pre-revamp edge case) gets a
      // default list + the default aisles so the feature works immediately.
      if (lists.value.length === 0 && activeHouseholdId.value) {
        await seedDefaultList();
      }
      restoreActiveList();
    } catch (error) {
      console.error('Fehler beim Laden der Listen:', error);
    } finally {
      loading.value = false;
    }
  };

  const seedDefaultList = async () => {
    if (!activeHouseholdId.value) return;
    const { data, error } = await supabase
      .from('shopping_lists')
      .insert({ household_id: activeHouseholdId.value, name: 'Einkaufsliste', icon: '🛒', position: 0 })
      .select()
      .single();
    if (error || !data) {
      console.error('Fehler beim Anlegen der Standard-Liste:', error);
      return;
    }
    lists.value = [data];
    // Make sure the household also has its aisles seeded.
    if (categories.value.length === 0) await fetchCategories();
  };

  const addList = async (name: string, icon = '🛒'): Promise<ShoppingList | null> => {
    const trimmed = name.trim();
    if (!trimmed || !activeHouseholdId.value) return null;
    const position = lists.value.reduce((m, l) => Math.max(m, l.position), -1) + 1;

    const { data, error } = await supabase
      .from('shopping_lists')
      .insert({ household_id: activeHouseholdId.value, name: trimmed, icon, position })
      .select()
      .single();

    if (error || !data) {
      console.error('Fehler beim Anlegen der Liste:', error);
      return null;
    }
    lists.value.push(data);
    setActiveList(data.id);
    return data;
  };

  const renameList = async (id: string, name: string, icon?: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const list = lists.value.find((l) => l.id === id);
    if (!list) return;
    const prevName = list.name;
    const prevIcon = list.icon;
    list.name = trimmed;
    if (icon !== undefined) list.icon = icon;

    const payload: { name: string; icon?: string } = { name: trimmed };
    if (icon !== undefined) payload.icon = icon;
    const { error } = await supabase.from('shopping_lists').update(payload).eq('id', id);
    if (error) {
      list.name = prevName;
      list.icon = prevIcon;
      console.error('Fehler beim Umbenennen der Liste:', error);
    }
  };

  const deleteList = async (id: string) => {
    if (lists.value.length <= 1) {
      throw new Error('Die letzte Liste kann nicht gelöscht werden.');
    }
    const prev = [...lists.value];
    const wasActive = activeListId.value === id;
    lists.value = lists.value.filter((l) => l.id !== id);
    if (wasActive) setActiveList(lists.value[0]?.id ?? null);

    // Entries cascade-delete with the list (FK ON DELETE CASCADE).
    const { error } = await supabase.from('shopping_lists').delete().eq('id', id);
    if (error) {
      lists.value = prev;
      console.error('Fehler beim Löschen der Liste:', error);
      throw error;
    }
  };

  // Persist a new list order (drag & drop). Reassigns positions 0..n-1.
  const reorderLists = async (orderedIds: string[]) => {
    const prev = lists.value.map((l) => ({ id: l.id, position: l.position }));

    orderedIds.forEach((id, idx) => {
      const list = lists.value.find((l) => l.id === id);
      if (list) list.position = idx;
    });
    lists.value.sort((a, b) => a.position - b.position);

    const results = await Promise.all(
      orderedIds.map((id, idx) =>
        supabase.from('shopping_lists').update({ position: idx }).eq('id', id),
      ),
    );
    const failed = results.find((r) => r.error);
    if (failed) {
      console.error('Fehler beim Sortieren der Listen:', failed.error);
      prev.forEach((p) => {
        const list = lists.value.find((l) => l.id === p.id);
        if (list) list.position = p.position;
      });
      lists.value.sort((a, b) => a.position - b.position);
    }
  };

  const setActiveList = (id: string | null) => {
    activeListId.value = id;
    if (activeHouseholdId.value && id) {
      localStorage.setItem(storageKey(activeHouseholdId.value), id);
    }
  };

  const clearLists = () => {
    lists.value = [];
    activeListId.value = null;
  };

  return {
    lists,
    activeListId,
    activeList,
    loading,
    fetchLists,
    addList,
    renameList,
    deleteList,
    reorderLists,
    setActiveList,
    clearLists,
  };
}
