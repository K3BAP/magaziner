import { ref, computed } from 'vue';
import { supabase } from '../supabase';
import { useActiveHousehold, householdSnapshot } from './useActiveHousehold';
import { toast } from './useToast';
import { useShoppingLists } from './useShoppingLists';
import { useShoppingCategories, type ShoppingCategory } from './useShoppingCategories';
import { guessCategoryKey, MISC_CATEGORY_KEY } from '../utils/shoppingCategories';
import { parseOfferPrefix, startOfDay, type OfferPrefix } from '../utils/offerDate';
import { normalize } from '../utils/text';

export interface ShoppingItem {
    id: string;
    title: string;
    is_completed: boolean;
    created_at: string;
    list_id: string | null;
    category_id: string | null;
    note?: string | null;
    household_id?: string;
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

// --- Autocomplete history -----------------------------------------------
// Titles the household has typed before, most-recent first. Persisted per
// device; seeded from the list itself so it is useful from day one.
const HISTORY_KEY = 'shopping_history_v1';
const HISTORY_CAP = 200;
const history = ref<string[]>(
    (() => {
        try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch { return []; }
    })(),
);
const saveHistory = () => {
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(history.value.slice(0, HISTORY_CAP))); } catch { /* quota */ }
};
const rememberTitle = (title: string) => {
    const clean = (parseOfferPrefix(title)?.rest ?? title).trim();
    if (!clean) return;
    history.value = [clean, ...history.value.filter(h => normalize(h) !== normalize(clean))].slice(0, HISTORY_CAP);
    saveHistory();
};
const seedHistory = (titles: string[]) => {
    let changed = false;
    for (const t of titles) {
        const clean = (parseOfferPrefix(t)?.rest ?? t).trim();
        if (clean && !history.value.some(h => normalize(h) === normalize(clean))) {
            history.value.push(clean);
            changed = true;
        }
    }
    if (changed) saveHistory();
};

/** Up to `limit` previous titles matching `query`, skipping ones already open on the list. */
const suggestions = (query: string, extra: string[] = [], limit = 5): string[] => {
    const q = normalize(query);
    if (q.length < 2) return [];
    const open = new Set(items.value.filter(i => !i.is_completed).map(i => normalize(i.title)));
    const seen = new Set<string>();
    const out: string[] = [];
    for (const cand of [...history.value, ...extra]) {
        const n = normalize(cand);
        if (seen.has(n) || open.has(n) || n === q) continue;
        seen.add(n);
        if (n.startsWith(q) || n.includes(' ' + q) || n.includes(q)) out.push(cand);
        if (out.length >= limit) break;
    }
    // Prefix matches first.
    return out.sort((a, b) => Number(!normalize(a).startsWith(q)) - Number(!normalize(b).startsWith(q)));
};

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
      const isCurrent = householdSnapshot();
            const { data, error } = await supabase
                .from('shopping_list')
                .select('*')
                .eq('list_id', activeListId.value)
                .order('is_completed', { ascending: true })
                .order('created_at', { ascending: false });

            if (!isCurrent()) return;
            if (error) throw error;
            items.value = data || [];
            refreshToday();
            seedHistory(items.value.map(i => i.title));
        } catch (error) {
            toast.error('Fehler beim Laden der Einkaufsliste.', error);
        } finally {
            loading.value = false;
        }
    };

    // 2. Add Item (auto-categorized via the offline dictionary)
    const addItem = async (title: string) => {
        const trimmed = title.trim();
        if (!trimmed) return;

        if (!activeHouseholdId.value || !activeListId.value) {
            toast.error('Keine aktive Liste — Eintrag konnte nicht gespeichert werden.');
            return;
        }

        // Already in the cart from last time? Put it back on the list instead of
        // creating a duplicate.
        const ticked = items.value.find(i => i.is_completed && normalize(i.title) === normalize(trimmed));
        if (ticked) {
            await toggleItem(ticked);
            rememberTitle(trimmed);
            return;
        }

        // Categorize on the product alone — the leading offer date, if any, says
        // nothing about the aisle.
        const forCategory = parseOfferPrefix(trimmed)?.rest ?? trimmed;
        const guessedCategoryId = categoryByKey(guessCategoryKey(forCategory))?.id ?? null;

        // Optimistic Update
        const tempId = `temp-${crypto.randomUUID()}`;
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
            toast.error('Eintrag konnte nicht gespeichert werden.', error);
            items.value = items.value.filter(i => i.id !== tempId); // Rollback
        } else if (data) {
            // The realtime echo may have landed first — never keep two copies.
            items.value = items.value.filter(i => i.id !== data.id);
            const index = items.value.findIndex(i => i.id === tempId);
            if (index !== -1) items.value[index] = data;
            else items.value.unshift(data);
        }
        rememberTitle(trimmed);
    };

    /** Insert several entries at once (e.g. a recipe's ingredients). */
    const addMany = async (titles: string[]) => {
        const clean = titles.map(t => t.trim()).filter(Boolean);
        if (clean.length === 0 || !activeHouseholdId.value || !activeListId.value) return 0;
        const rows = clean.map(title => ({
            title,
            household_id: activeHouseholdId.value,
            list_id: activeListId.value,
            category_id: categoryByKey(guessCategoryKey(parseOfferPrefix(title)?.rest ?? title))?.id ?? null,
        }));
        const { data, error } = await supabase.from('shopping_list').insert(rows).select();
        if (error) {
            toast.error('Einträge konnten nicht gespeichert werden.', error);
            return 0;
        }
        for (const row of data ?? []) {
            if (!items.value.some(i => i.id === row.id)) items.value.unshift(row);
        }
        clean.forEach(rememberTitle);
        return data?.length ?? 0;
    };

    /** Edit title / note. Re-categorizes only when the user didn't pick an aisle by hand before. */
    const updateItem = async (item: ShoppingItem, patch: { title?: string; note?: string | null; category_id?: string | null }) => {
        const prev = { title: item.title, note: item.note ?? null, category_id: item.category_id };
        if (patch.title !== undefined) patch.title = patch.title.trim();
        if (patch.title === '') return;
        Object.assign(item, patch);
        const { error } = await supabase.from('shopping_list').update(patch).eq('id', item.id);
        if (error) {
            Object.assign(item, prev);
            toast.error('Eintrag konnte nicht gespeichert werden.', error);
        }
    };

    /** Delete a single entry — always with undo, since a swipe is easy to trigger. */
    const deleteItem = async (item: ShoppingItem) => {
        const snapshot = { ...item };
        items.value = items.value.filter(i => i.id !== item.id);
        const { error } = await supabase.from('shopping_list').delete().eq('id', item.id);
        if (error) {
            items.value.push(snapshot);
            return toast.error('Eintrag konnte nicht gelöscht werden.', error);
        }
        toast.undo(`„${snapshot.title}“ entfernt`, () => restore([snapshot]));
    };

    const restore = async (rows: ShoppingItem[]) => {
        const { error } = await supabase.from('shopping_list').upsert(
            rows.map(r => ({
                id: r.id,
                title: r.title,
                is_completed: r.is_completed,
                created_at: r.created_at,
                list_id: r.list_id,
                category_id: r.category_id,
                note: r.note ?? null,
                household_id: activeHouseholdId.value,
            })),
        );
        if (error) return toast.error('Wiederherstellen fehlgeschlagen.', error);
        for (const r of rows) {
            if (r.list_id === activeListId.value && !items.value.some(i => i.id === r.id)) items.value.push(r);
        }
    };

    /** Realtime: apply a change made elsewhere (or our own echo). */
    const applyRemote = (event: 'INSERT' | 'UPDATE' | 'DELETE', row: any, old: any) => {
        if (event === 'DELETE') {
            items.value = items.value.filter(i => i.id !== old?.id);
            return;
        }
        const idx = items.value.findIndex(i => i.id === row.id);
        if (row.list_id !== activeListId.value) {
            if (idx !== -1) items.value.splice(idx, 1); // moved to another list
            return;
        }
        if (idx === -1) {
            // Our own optimistic insert may still be pending under a temp id.
            const temp = items.value.findIndex(i => i.id.startsWith('temp-') && i.title === row.title);
            if (temp !== -1) items.value[temp] = row;
            else items.value.unshift(row);
        } else {
            items.value[idx] = { ...items.value[idx], ...row };
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
            toast.error('Eintrag konnte nicht aktualisiert werden.', error);
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
            toast.error('Abgehakte Einträge konnten nicht gelöscht werden.', error);
            return;
        }
        const doomed = prevItems.filter(i => doomedIds.includes(i.id));
        toast.undo(
            doomed.length === 1 ? 'Ein Eintrag gelöscht' : `${doomed.length} Einträge gelöscht`,
            () => restore(doomed),
        );
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
            toast.error('Kategorie konnte nicht geändert werden.', error);
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
        clearItems,
        addMany,
        updateItem,
        deleteItem,
        applyRemote,
        suggestions,
    };
}
