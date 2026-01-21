import { ref } from 'vue';
import { supabase } from '../supabase';

export interface ShoppingItem {
    id: string;
    title: string;
    is_completed: boolean;
    created_at: string;
}

const items = ref<ShoppingItem[]>([]);
const loading = ref(false);

export function useShoppingList() {

    // 1. Fetch Items
    const fetchItems = async () => {
        try {
            loading.value = true;
            const { data, error } = await supabase
                .from('shopping_list')
                .select('*')
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

    // 2. Add Item
    const addItem = async (title: string) => {
        if (!title.trim()) return;

        // Optimistic Update
        const tempId = crypto.randomUUID();
        const newItem: ShoppingItem = {
            id: tempId,
            title,
            is_completed: false,
            created_at: new Date().toISOString()
        };
        items.value.unshift(newItem);

        const { data, error } = await supabase
            .from('shopping_list')
            .insert({ title })
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

        // Resort
        items.value.sort((a, b) => {
            if (a.is_completed === b.is_completed) {
                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            }
            return a.is_completed ? 1 : -1;
        });

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

    return {
        items,
        loading,
        fetchItems,
        addItem,
        toggleItem,
        deleteItem
    };
}
