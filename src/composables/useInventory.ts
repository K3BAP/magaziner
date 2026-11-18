import { ref, computed } from 'vue';
import { supabase } from '../supabase';
import { useActiveHousehold, householdSnapshot } from './useActiveHousehold';
import { toast } from './useToast';
import { guessCategoryKey } from '../utils/shoppingCategories';
import { normalize, searchTerms } from '../utils/text';
import { expiryStatus, type ExpiryStatus } from '../utils/date';

export interface ItemInstance {
  id: string;
  item_id: string;
  quantity: number;
  expiry_date: string | null;
  opened_at?: string | null;
  household_id?: string;
  created_at?: string;
}

export interface Item {
  id: string;
  name: string;
  location_id: string;
  category_id: string | null;
  minimum_stock: number | null;
  barcode?: string | null;
  household_id?: string;
  instances: ItemInstance[];
}

export interface Location {
  id: string;
  name: string;
  icon: string | null;
}

export interface Category {
  id: string;
  name: string;
  location_id: string;
}

// Global state
const locations = ref<Location[]>([]);
const categories = ref<Category[]>([]);
const items = ref<Item[]>([]);
const loading = ref(false);
const loaded = ref(false);

/** Soonest expiry first, undated last. */
const byExpiry = (a: ItemInstance, b: ItemInstance) => {
  if (!a.expiry_date && !b.expiry_date) return 0;
  if (!a.expiry_date) return 1;
  if (!b.expiry_date) return -1;
  return a.expiry_date.localeCompare(b.expiry_date);
};

export const totalQuantity = (item: Item) => item.instances.reduce((acc, i) => acc + i.quantity, 0);

/** Worst expiry state across an item's instances. */
export const itemExpiryStatus = (item: Item): ExpiryStatus => {
  const order: ExpiryStatus[] = ['expired', 'soon', 'ok', 'none'];
  let worst: ExpiryStatus = 'none';
  for (const inst of item.instances) {
    const s = expiryStatus(inst.expiry_date);
    if (order.indexOf(s) < order.indexOf(worst)) worst = s;
  }
  return worst;
};

export const isBelowMinimum = (item: Item) =>
  item.minimum_stock !== null && item.minimum_stock > 0 && totalQuantity(item) < item.minimum_stock;

export function useInventory() {
  const { activeHouseholdId } = useActiveHousehold();
  const requireHousehold = (): string => {
    if (!activeHouseholdId.value) throw new Error('Kein aktiver Haushalt');
    return activeHouseholdId.value;
  };

  const findItem = (id: string) => items.value.find((i) => i.id === id);

  // --- Fetch ---------------------------------------------------------------
  const fetchInventory = async (opts: { silent?: boolean } = {}) => {
    const isCurrent = householdSnapshot();
    if (!opts.silent) loading.value = true;
    try {
      const [locRes, catRes, itemRes] = await Promise.all([
        supabase.from('locations').select('*').order('name'),
        supabase.from('categories').select('*').order('name'),
        supabase.from('items').select('*, instances:item_instances(*)').order('name'),
      ]);
      if (!isCurrent()) return;
      const error = locRes.error || catRes.error || itemRes.error;
      if (error) throw error;

      locations.value = locRes.data || [];
      categories.value = catRes.data || [];
      const raw = (itemRes.data || []) as Item[];
      raw.forEach((item) => item.instances?.sort(byExpiry));
      items.value = raw;
      loaded.value = true;
    } catch (error) {
      toast.error('Vorräte konnten nicht geladen werden.', error);
    } finally {
      loading.value = false;
    }
  };

  // --- Low-stock automation -----------------------------------------------
  /**
   * Put `item` on the household's first shopping list when it drops below its
   * minimum. Only *open* entries count as "already on the list" — a ticked-off
   * entry from last week must not block the re-order.
   */
  const ensureOnShoppingList = async (item: Item, remaining: number) => {
    const householdId = requireHousehold();

    const { data: existing, error: existingError } = await supabase
      .from('shopping_list')
      .select('id')
      .eq('household_id', householdId)
      .eq('is_completed', false)
      .ilike('title', item.name)
      .limit(1);
    if (existingError) return toast.error('Einkaufsliste konnte nicht geprüft werden.', existingError);
    if (existing && existing.length > 0) return;

    const [{ data: defaultList }, { data: category }] = await Promise.all([
      supabase
        .from('shopping_lists')
        .select('id, name')
        .eq('household_id', householdId)
        .order('position', { ascending: true })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('shopping_categories')
        .select('id')
        .eq('household_id', householdId)
        .eq('key', guessCategoryKey(item.name))
        .limit(1)
        .maybeSingle(),
    ]);

    const { data: inserted, error } = await supabase
      .from('shopping_list')
      .insert({
        title: item.name,
        household_id: householdId,
        list_id: defaultList?.id ?? null,
        category_id: category?.id ?? null,
      })
      .select('id')
      .single();

    if (error || !inserted) return toast.error('Konnte nicht auf die Einkaufsliste setzen.', error);

    toast.undo(
      `„${item.name}“ ist knapp (${remaining} übrig) – steht jetzt auf „${defaultList?.name ?? 'Einkaufsliste'}“.`,
      async () => {
        await supabase.from('shopping_list').delete().eq('id', inserted.id);
      },
    );
  };

  const checkMinimum = (item: Item, before: number) => {
    if (item.minimum_stock === null || item.minimum_stock <= 0) return;
    const after = totalQuantity(item);
    // Only on a decrease; ensureOnShoppingList itself skips already-listed items.
    if (after < item.minimum_stock && after < before) ensureOnShoppingList(item, after);
  };

  // --- Items ---------------------------------------------------------------
  const addItem = async (input: {
    name: string;
    locationId: string;
    categoryId: string | null;
    quantity: number;
    expiryDate: string | null;
    openedAt: string | null;
    minimumStock: number | null;
    barcode?: string | null;
  }): Promise<Item | null> => {
    const householdId = requireHousehold();
    const { data: newItem, error } = await supabase
      .from('items')
      .insert({
        name: input.name.trim(),
        location_id: input.locationId,
        category_id: input.categoryId,
        minimum_stock: input.minimumStock,
        barcode: input.barcode || null,
        household_id: householdId,
      })
      .select()
      .single();

    if (error || !newItem) {
      toast.error('Produkt konnte nicht angelegt werden.', error);
      return null;
    }

    const item: Item = { ...newItem, instances: [] };
    items.value.push(item);
    items.value.sort((a, b) => a.name.localeCompare(b.name, 'de'));
    await addInstance(item.id, input.quantity, input.expiryDate, input.openedAt);
    return findItem(item.id) ?? item;
  };

  const updateItem = async (
    itemId: string,
    patch: Partial<Pick<Item, 'name' | 'category_id' | 'minimum_stock' | 'location_id' | 'barcode'>>,
  ) => {
    const item = findItem(itemId);
    if (!item) return false;
    const prev = { ...item };

    // Moving to another location drops a category that belongs to the old one.
    if (patch.location_id && patch.location_id !== item.location_id && patch.category_id === undefined) {
      patch.category_id = null;
    }
    Object.assign(item, patch);

    const { error } = await supabase.from('items').update(patch).eq('id', itemId);
    if (error) {
      Object.assign(item, {
        name: prev.name,
        category_id: prev.category_id,
        minimum_stock: prev.minimum_stock,
        location_id: prev.location_id,
        barcode: prev.barcode,
      });
      toast.error('Produkt konnte nicht gespeichert werden.', error);
      return false;
    }
    return true;
  };

  /** Re-create a deleted item (and its instances) with the same ids. */
  const restoreItem = async (snapshot: Item) => {
    const { instances, ...row } = snapshot;
    const { error } = await supabase.from('items').upsert({ ...row, household_id: requireHousehold() });
    if (error) return toast.error('Wiederherstellen fehlgeschlagen.', error);
    if (instances.length > 0) {
      const { error: instError } = await supabase
        .from('item_instances')
        .upsert(instances.map((i) => ({ ...i, household_id: requireHousehold() })));
      if (instError) return toast.error('Wiederherstellen fehlgeschlagen.', instError);
    }
    if (!findItem(snapshot.id)) items.value.push({ ...snapshot, instances: [...instances].sort(byExpiry) });
    items.value.sort((a, b) => a.name.localeCompare(b.name, 'de'));
  };

  const deleteItem = async (itemId: string) => {
    const item = findItem(itemId);
    if (!item) return;
    const snapshot: Item = JSON.parse(JSON.stringify(item));
    items.value = items.value.filter((i) => i.id !== itemId);

    const { error } = await supabase.from('items').delete().eq('id', itemId);
    if (error) {
      items.value.push(snapshot);
      return toast.error('Produkt konnte nicht gelöscht werden.', error);
    }
    toast.undo(`„${snapshot.name}“ gelöscht`, () => restoreItem(snapshot));
  };

  // --- Instances -----------------------------------------------------------
  const addInstance = async (
    itemId: string,
    quantity: number,
    expiryDate: string | null,
    openedAt: string | null = null,
  ) => {
    const { data, error } = await supabase
      .from('item_instances')
      .insert({
        item_id: itemId,
        quantity: Math.max(1, Number(quantity) || 1),
        expiry_date: expiryDate || null,
        opened_at: openedAt || null,
        household_id: requireHousehold(),
      })
      .select()
      .single();

    if (error || !data) {
      toast.error('Packung konnte nicht hinzugefügt werden.', error);
      return null;
    }

    const item = findItem(itemId);
    if (item && !item.instances.some((i) => i.id === data.id)) {
      item.instances.push(data);
      item.instances.sort(byExpiry);
    }
    return data as ItemInstance;
  };

  const updateInstance = async (
    itemId: string,
    instanceId: string,
    updates: { quantity?: number; opened_at?: string | null; expiry_date?: string | null },
  ) => {
    const item = findItem(itemId);
    const instance = item?.instances.find((i) => i.id === instanceId);
    if (!item || !instance) return;

    const before = totalQuantity(item);
    const prev = { quantity: instance.quantity, opened_at: instance.opened_at ?? null, expiry_date: instance.expiry_date };
    Object.assign(instance, updates);
    if (updates.expiry_date !== undefined) item.instances.sort(byExpiry);

    const { error } = await supabase.from('item_instances').update(updates).eq('id', instanceId);
    if (error) {
      Object.assign(instance, prev);
      item.instances.sort(byExpiry);
      return toast.error('Speichern fehlgeschlagen.', error);
    }
    if (updates.quantity !== undefined) checkMinimum(item, before);
  };

  /** Remove one instance; deletes the parent item when it was the last one. Undo-able. */
  const deleteInstance = async (itemId: string, instanceId: string) => {
    const item = findItem(itemId);
    const inst = item?.instances.find((i) => i.id === instanceId);
    if (!item || !inst) return;

    const before = totalQuantity(item);
    const itemSnapshot: Item = JSON.parse(JSON.stringify(item));
    const lastOne = item.instances.length === 1;

    item.instances = item.instances.filter((i) => i.id !== instanceId);
    if (lastOne) items.value = items.value.filter((i) => i.id !== itemId);

    // Instance first (so the activity trigger can still resolve the item name),
    // then the now-empty parent item.
    let { error } = await supabase.from('item_instances').delete().eq('id', instanceId);
    if (!error && lastOne) ({ error } = await supabase.from('items').delete().eq('id', itemId));

    if (error) {
      if (lastOne) items.value.push(itemSnapshot);
      else item.instances = itemSnapshot.instances;
      return toast.error('Löschen fehlgeschlagen.', error);
    }

    toast.undo(`„${item.name}“ aufgebraucht`, async () => {
      if (lastOne) return restoreItem(itemSnapshot);
      const { error: e } = await supabase.from('item_instances').insert({ ...inst, household_id: requireHousehold() });
      if (e) return toast.error('Wiederherstellen fehlgeschlagen.', e);
      const current = findItem(itemId);
      if (current && !current.instances.some((i) => i.id === inst.id)) {
        current.instances.push(inst);
        current.instances.sort(byExpiry);
      }
    });

    checkMinimum({ ...item, instances: lastOne ? [] : item.instances }, before);
  };

  /** Decrement by one; at zero the instance is consumed (with undo). */
  const consumeOne = async (itemId: string, instanceId: string) => {
    const inst = findItem(itemId)?.instances.find((i) => i.id === instanceId);
    if (!inst) return;
    if (inst.quantity <= 1) return deleteInstance(itemId, instanceId);
    return updateInstance(itemId, instanceId, { quantity: inst.quantity - 1 });
  };

  // --- Locations -----------------------------------------------------------
  const addLocation = async (name: string, icon: string) => {
    const { data, error } = await supabase
      .from('locations')
      .insert({ name: name.trim(), icon, household_id: requireHousehold() })
      .select()
      .single();
    if (error || !data) {
      toast.error('Ort konnte nicht angelegt werden.', error);
      return null;
    }
    locations.value.push(data);
    locations.value.sort((a, b) => a.name.localeCompare(b.name, 'de'));
    return data as Location;
  };

  const updateLocation = async (id: string, name: string, icon: string) => {
    const loc = locations.value.find((l) => l.id === id);
    if (!loc) return;
    const prev = { name: loc.name, icon: loc.icon };
    loc.name = name.trim();
    loc.icon = icon;
    const { error } = await supabase.from('locations').update({ name: loc.name, icon }).eq('id', id);
    if (error) {
      Object.assign(loc, prev);
      toast.error('Ort konnte nicht gespeichert werden.', error);
    }
  };

  /** Deletes the location; items and categories cascade in the DB. */
  const deleteLocation = async (id: string) => {
    const prevLocs = [...locations.value];
    const prevItems = [...items.value];
    const prevCats = [...categories.value];
    locations.value = locations.value.filter((l) => l.id !== id);
    items.value = items.value.filter((i) => i.location_id !== id);
    categories.value = categories.value.filter((c) => c.location_id !== id);

    const { error } = await supabase.from('locations').delete().eq('id', id);
    if (error) {
      locations.value = prevLocs;
      items.value = prevItems;
      categories.value = prevCats;
      toast.error('Ort konnte nicht gelöscht werden.', error);
      return false;
    }
    toast.success('Ort gelöscht');
    return true;
  };

  // --- Categories ----------------------------------------------------------
  const addCategory = async (name: string, locationId: string) => {
    const trimmed = name.trim();
    const existing = categories.value.find(
      (c) => c.location_id === locationId && normalize(c.name) === normalize(trimmed),
    );
    if (existing) return existing;
    const { data, error } = await supabase
      .from('categories')
      .insert({ name: trimmed, location_id: locationId, household_id: requireHousehold() })
      .select()
      .single();
    if (error || !data) {
      toast.error('Kategorie konnte nicht angelegt werden.', error);
      return null;
    }
    categories.value.push(data);
    categories.value.sort((a, b) => a.name.localeCompare(b.name, 'de'));
    return data as Category;
  };

  const renameCategory = async (catId: string, name: string) => {
    const cat = categories.value.find((c) => c.id === catId);
    if (!cat || !name.trim()) return;
    const prev = cat.name;
    cat.name = name.trim();
    const { error } = await supabase.from('categories').update({ name: cat.name }).eq('id', catId);
    if (error) {
      cat.name = prev;
      toast.error('Kategorie konnte nicht umbenannt werden.', error);
    }
  };

  /** Deletes a category; its products stay and become uncategorized. */
  const deleteCategory = async (catId: string) => {
    const affected = items.value.filter((i) => i.category_id === catId);
    if (affected.length > 0) {
      const { error } = await supabase.from('items').update({ category_id: null }).eq('category_id', catId);
      if (error) {
        toast.error('Kategorie konnte nicht gelöscht werden.', error);
        return false;
      }
      affected.forEach((i) => (i.category_id = null));
    }
    const { error } = await supabase.from('categories').delete().eq('id', catId);
    if (error) {
      toast.error('Kategorie konnte nicht gelöscht werden.', error);
      return false;
    }
    categories.value = categories.value.filter((c) => c.id !== catId);
    return true;
  };

  // --- Getters -------------------------------------------------------------
  const getLocationName = (locId: string) => locations.value.find((l) => l.id === locId)?.name || '';
  const getLocation = (locId: string) => locations.value.find((l) => l.id === locId) ?? null;

  const getItemsByLocation = (locId: string) =>
    computed(() => {
      const locItems = items.value.filter((i) => i.location_id === locId);
      const uncategorized = locItems.filter((i) => !i.category_id);
      const grouped = categories.value
        .filter((c) => c.location_id === locId)
        .map((cat) => ({ ...cat, items: locItems.filter((i) => i.category_id === cat.id) }))
        .filter((group) => group.items.length > 0);
      return { uncategorized, grouped };
    });

  /** Umlaut-tolerant AND search over product name, category and location. */
  const matchesQuery = (item: Item, query: string) => {
    const terms = searchTerms(query);
    if (terms.length === 0) return true;
    const cat = categories.value.find((c) => c.id === item.category_id)?.name ?? '';
    const hay = normalize(`${item.name} ${cat} ${getLocationName(item.location_id)}`);
    return terms.every((t) => hay.includes(t));
  };

  const searchItems = (query: string) => (query ? items.value.filter((i) => matchesQuery(i, query)) : []);

  const findByBarcode = (code: string) => items.value.find((i) => i.barcode === code) ?? null;

  const clearInventory = () => {
    locations.value = [];
    categories.value = [];
    items.value = [];
    loaded.value = false;
  };

  return {
    locations,
    items,
    categories,
    loading,
    loaded,
    fetchInventory,
    clearInventory,
    addItem,
    updateItem,
    deleteItem,
    addInstance,
    updateInstance,
    /** @deprecated alias kept for older callers */
    updateInstanceDetails: updateInstance,
    deleteInstance,
    consumeOne,
    addLocation,
    updateLocation,
    deleteLocation,
    addCategory,
    renameCategory,
    deleteCategory,
    getItemsByLocation,
    getLocationName,
    getLocation,
    matchesQuery,
    searchItems,
    findByBarcode,
  };
}
