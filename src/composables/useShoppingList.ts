import { ref, computed } from 'vue';
import { supabase } from '../supabase';
import { useActiveHousehold } from './useActiveHousehold';
import { useShoppingLists } from './useShoppingLists';
import { useShoppingCategories, type ShoppingCategory } from './useShoppingCategories';
import { guessCategoryKey, MISC_CATEGORY_KEY } from '../utils/shoppingCategories';
import { parseOfferPrefix, startOfDay, type OfferPrefix } from '../utils/offerDate';

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

/** A parsed offer prefix plus whether that day is still ahead of us. */
export interface ItemOffer extends OfferPrefix {
    isFuture: boolean;
}

// Sentinel ids for the two synthetic offer buckets. Real groups carry a
// category UUID, so these can't collide.
const OFFER_NOW_ID = '__offer_now';
const OFFER_SOON_ID = '__offer_soon';

const items = ref<ShoppingItem[]>([]);
const loading = ref(false);

// "Today" has to be reactive: `groupedItems` is a computed, and a computed can't
// re-run on wall-clock time. Without this, a PWA left open overnight would still
// show yesterday's split into "bald" and "jetzt".
const today = ref(startOfDay(new Date()));

const refreshToday = () => {
    const current = startOfDay(new Date());
    if (current.getTime() !== today.value.getTime()) today.value = current;
};

// Registered once, at module scope — the app is re-opened far more often than
// it is left running across midnight.
if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) refreshToday();
    });
}

/** The offer date in front of an entry's title, or `null` if there is none. */
const offerFor = (item: ShoppingItem): ItemOffer | null => {
    const parsed = parseOfferPrefix(item.title, today.value);
    if (!parsed) return null;
    return { ...parsed, isFuture: parsed.date.getTime() > today.value.getTime() };
};

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
            refreshToday();
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

        // Categorize on the product alone — the leading offer date, if any, says
        // nothing about the aisle.
        const forCategory = parseOfferPrefix(trimmed)?.rest ?? trimmed;
        const guessedCategoryId = categoryByKey(guessCategoryKey(forCategory))?.id ?? null;

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

    // 4. Delete all completed entries of the active list.
    //    Deliberately keyed on the collected ids instead of `.eq('is_completed',
    //    true)` so exactly the entries the user saw ticked off disappear — and
    //    none that another household member ticked off in the meantime.
    const deleteCompleted = async () => {
        const doomedIds = items.value.filter(i => i.is_completed).map(i => i.id);
        if (doomedIds.length === 0) return;

        const prevItems = [...items.value];
        items.value = items.value.filter(i => !i.is_completed);

        const { error } = await supabase.from('shopping_list').delete().in('id', doomedIds);

        if (error) {
            items.value = prevItems; // Rollback
            console.error('Fehler beim Löschen der abgehakten Einträge:', error);
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
    // aisle row was deleted. Entries carrying an offer date skip the aisles
    // entirely and land in one of two synthetic buckets — "jetzt im Angebot"
    // above everything, "bald im Angebot" below everything.
    const groupedItems = computed<ShoppingGroup[]>(() => {
        const sortWithin = (a: ShoppingItem, b: ShoppingItem) => {
            if (a.is_completed !== b.is_completed) return a.is_completed ? 1 : -1;
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        };

        // Split off the offer entries first; the aisles only ever see the rest.
        // The `category_id` of an offer entry stays untouched in the DB, so it
        // falls back into its aisle the moment the date is edited out again.
        const nowItems: ShoppingItem[] = [];
        const soonItems: ShoppingItem[] = [];
        const plainItems: ShoppingItem[] = [];
        const offerDay = new Map<string, number>();

        for (const item of items.value) {
            const offer = offerFor(item);
            if (!offer) {
                plainItems.push(item);
                continue;
            }
            offerDay.set(item.id, offer.date.getTime());
            (offer.isFuture ? soonItems : nowItems).push(item);
        }

        // Completed entries sink here too; among the open ones "bald" counts
        // down to the next offer, "jetzt" leads with the freshest one.
        const byOfferDay = (direction: 1 | -1) => (a: ShoppingItem, b: ShoppingItem) => {
            if (a.is_completed !== b.is_completed) return a.is_completed ? 1 : -1;
            return direction * ((offerDay.get(a.id) ?? 0) - (offerDay.get(b.id) ?? 0));
        };

        const ordered = [...categories.value].sort((a, b) => a.position - b.position);
        const groups: ShoppingGroup[] = [];
        let miscBucket: ShoppingGroup | null = null;

        for (const cat of ordered) {
            const groupItems = plainItems
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
        const orphans = plainItems
            .filter(i => !i.category_id || !knownIds.has(i.category_id))
            .sort(sortWithin);

        if (miscBucket) {
            miscBucket.items = [...miscBucket.items, ...orphans].sort(sortWithin);
            if (miscBucket.items.length > 0) groups.push(miscBucket);
        } else if (orphans.length > 0) {
            groups.push({ id: null, name: 'Sonstiges', icon: '🛒', items: orphans });
        }

        if (nowItems.length > 0) {
            groups.unshift({
                id: OFFER_NOW_ID,
                name: 'Jetzt im Angebot',
                icon: '🔥',
                items: nowItems.sort(byOfferDay(-1)),
            });
        }
        if (soonItems.length > 0) {
            groups.push({
                id: OFFER_SOON_ID,
                name: 'Bald im Angebot',
                icon: '🗓️',
                items: soonItems.sort(byOfferDay(1)),
            });
        }

        return groups;
    });

    // `items` only ever holds the active list, so this is list-scoped already.
    const completedCount = computed(() => items.value.filter(i => i.is_completed).length);

    const clearItems = () => {
        items.value = [];
    };

    return {
        items,
        loading,
        today,
        offerFor,
        groupedItems,
        completedCount,
        fetchItems,
        addItem,
        toggleItem,
        deleteCompleted,
        setItemCategory,
        clearItems
    };
}
