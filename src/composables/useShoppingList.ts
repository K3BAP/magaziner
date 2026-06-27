import { ref, computed } from 'vue';
import { supabase } from '../supabase';
import { useActiveHousehold } from './useActiveHousehold';
import { useShoppingLists } from './useShoppingLists';
import { useShoppingCategories, type ShoppingCategory } from './useShoppingCategories';
import { guessCategoryKey, MISC_CATEGORY_KEY } from '../utils/shoppingCategories';

export interface ShoppingItem {
    id: string;
    title: string;
    is_completed: boolean;
    created_at: string;
    list_id: string | null;
    category_id: string | null;
}

/** A category bucket plus its entries, ready to render in aisle order. */
export interface ShoppingGroup {
    id: string | null;
    name: string;
    icon: string;
    items: ShoppingItem[];
}

const items = ref<ShoppingItem[]>([]);
const loading = ref(false);

export function useShoppingList() {

    const { activeHouseholdId } = useActiveHousehold();
    const { activeListId } = useShoppingLists();
    const { categories, categoryByKey } = useShoppingCategories();

    // 1. Fetch Items for the active list
    const fetchItems = async () => {
        if (!activeListId.value) {
            items.value = [];
            return;
        }
        try {
            loading.value = true;
            const { data, error } = await supabase
                .from('shopping_list')
                .select('*')
                .eq('list_id', activeListId.value)
                .order('is_completed', { ascending: true })
                .order('created_at', { ascending: false });

            if (error) throw error;
            items.value = data || [];
        } catch (error) {
            console.error('Fehler beim Laden der Einkaufsliste:', error);
        } finally {
            loading.value = false;
        }
    };

    // 2. Add Item (auto-categorized via the offline dictionary)
    const addItem = async (title: string) => {
        const trimmed = title.trim();
        if (!trimmed) return;

        if (!activeHouseholdId.value || !activeListId.value) {
            console.error('Keine aktive Liste — Eintrag konnte nicht gespeichert werden.');
            return;
        }

        const guessedCategoryId = categoryByKey(guessCategoryKey(trimmed))?.id ?? null;

        // Optimistic Update
        const tempId = crypto.randomUUID();
        const newItem: ShoppingItem = {
            id: tempId,
            title: trimmed,
            is_completed: false,
            created_at: new Date().toISOString(),
            list_id: activeListId.value,
            category_id: guessedCategoryId,
        };
        items.value.unshift(newItem);

        const { data, error } = await supabase
            .from('shopping_list')
            .insert({
                title: trimmed,
                household_id: activeHouseholdId.value,
                list_id: activeListId.value,
                category_id: guessedCategoryId,
            })
            .select()
            .single();

        if (error) {
            console.error('Fehler beim Speichern:', error);
            items.value = items.value.filter(i => i.id !== tempId); // Rollback
        } else if (data) {
            const index = items.value.findIndex(i => i.id === tempId);
            if (index !== -1) items.value[index] = data;
        }
    };

    // 3. Toggle Status
    const toggleItem = async (item: ShoppingItem) => {
        const oldStatus = item.is_completed;
        item.is_completed = !oldStatus;

        const { error } = await supabase
            .from('shopping_list')
            .update({ is_completed: item.is_completed })
            .eq('id', item.id);

        if (error) {
            item.is_completed = oldStatus; // Rollback
            console.error('Fehler beim Update:', error);
        }
    };

    // 4. Delete Item
    const deleteItem = async (id: string) => {
        const prevItems = [...items.value];
        items.value = items.value.filter(i => i.id !== id);

        const { error } = await supabase.from('shopping_list').delete().eq('id', id);

        if (error) {
            items.value = prevItems; // Rollback
            console.error('Fehler beim Löschen:', error);
        }
    };

    // 5. Manual category override
    const setItemCategory = async (item: ShoppingItem, categoryId: string | null) => {
        const prev = item.category_id;
        item.category_id = categoryId;

        const { error } = await supabase
            .from('shopping_list')
            .update({ category_id: categoryId })
            .eq('id', item.id);

        if (error) {
            item.category_id = prev; // Rollback
            console.error('Fehler beim Ändern der Kategorie:', error);
        }
    };

    // Group items by aisle in category position order. Within a group: open
    // items first (newest first), completed sink to the bottom. A synthetic
    // "Sonstiges" bucket always catches uncategorized entries, even if the misc
    // aisle row was deleted.
    const groupedItems = computed<ShoppingGroup[]>(() => {
        const sortWithin = (a: ShoppingItem, b: ShoppingItem) => {
            if (a.is_completed !== b.is_completed) return a.is_completed ? 1 : -1;
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        };

        const ordered = [...categories.value].sort((a, b) => a.position - b.position);
        const groups: ShoppingGroup[] = [];
        let miscBucket: ShoppingGroup | null = null;

        for (const cat of ordered) {
            const groupItems = items.value
                .filter(i => i.category_id === cat.id)
                .sort(sortWithin);
            const group: ShoppingGroup = {
                id: cat.id,
                name: cat.name,
                icon: cat.icon ?? '🛒',
                items: groupItems,
            };
            if (cat.key === MISC_CATEGORY_KEY) miscBucket = group;
            else if (groupItems.length > 0) groups.push(group);
        }

        // Entries whose category was deleted (category_id no longer resolves) or
        // that were never categorized fall into the misc bucket.
        const knownIds = new Set(ordered.map((c: ShoppingCategory) => c.id));
        const orphans = items.value
            .filter(i => !i.category_id || !knownIds.has(i.category_id))
            .sort(sortWithin);

        if (miscBucket) {
            miscBucket.items = [...miscBucket.items, ...orphans].sort(sortWithin);
            if (miscBucket.items.length > 0) groups.push(miscBucket);
        } else if (orphans.length > 0) {
            groups.push({ id: null, name: 'Sonstiges', icon: '🛒', items: orphans });
        }

        return groups;
    });

    const clearItems = () => {
        items.value = [];
    };

    return {
        items,
        loading,
        groupedItems,
        fetchItems,
        addItem,
        toggleItem,
        deleteItem,
        setItemCategory,
        clearItems
    };
}
