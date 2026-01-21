import { ref, computed } from 'vue';
import { supabase } from '../supabase';

export interface ItemInstance {
  id: string;
  item_id: string;
  quantity: number;
  expiry_date: string | null;
  opened_at?: string | null;
}

export interface Item {
  id: string;
  name: string;
  location_id: string;
  category_id: string | null;
  minimum_stock: number | null;
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

// Globaler State
const locations = ref<Location[]>([]);
const categories = ref<Category[]>([]);
const items = ref<Item[]>([]);
const loading = ref(false);

export function useInventory() {

  // 1. FETCH (Mit Join auf Instanzen)
  const fetchInventory = async () => {
    try {
      loading.value = true;

      const [locRes, catRes, itemRes] = await Promise.all([
        supabase.from('locations').select('*').order('name'),
        supabase.from('categories').select('*').order('name'),
        // WICHTIG: Wir laden die Instanzen gleich mit sortiert nach Datum
        supabase.from('items').select('*, instances:item_instances(*)')
      ]);

      if (locRes.error) throw locRes.error;
      if (catRes.error) throw catRes.error;
      if (itemRes.error) throw itemRes.error;

      locations.value = locRes.data || [];
      categories.value = catRes.data || [];

      // Instanzen innerhalb der Items sortieren (Bald ablaufende zuerst)
      const rawItems = itemRes.data || [];
      rawItems.forEach((item: any) => {
        if (item.instances) {
          item.instances.sort((a: ItemInstance, b: ItemInstance) => {
            if (!a.expiry_date) return 1;
            if (!b.expiry_date) return -1;
            return new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime();
          });
        }
      });
      items.value = rawItems;

    } catch (error) {
      console.error('Fehler beim Laden:', error);
    } finally {
      loading.value = false;
    }
  };

  // 2. ITEM ERSTELLEN (Parent + Erste Instanz)
  const addItem = async (name: string, locationId: string, categoryId: string | null, quantity: number, expiryDate: string | null, openedAt: string | null, minimumStock: number | null) => {
    // A) Item Container erstellen
    const { data: newItem, error: itemError } = await supabase
      .from('items')
      .insert({ name, location_id: locationId, category_id: categoryId, minimum_stock: minimumStock })
      .select()
      .single();

    if (itemError || !newItem) {
      alert('Fehler beim Item erstellen');
      return;
    }

    // B) Erste Instanz erstellen
    await addInstance(newItem.id, quantity, expiryDate, openedAt);

    // Lokal neuladen (einfachster Weg für Konsistenz)
    await fetchInventory();
  };

  // 3. NEUE INSTANZ HINZUFÜGEN (Zu existierendem Item)
  const addInstance = async (
    itemId: string,
    quantity: number,
    expiryDate: string | null,
    openedAt: string | null = null
  ) => {
    const finalDate = expiryDate === '' ? null : expiryDate;
    const finalOpened = openedAt === '' ? null : openedAt;

    const { data, error } = await supabase
      .from('item_instances')
      .insert({
        item_id: itemId,
        quantity,
        expiry_date: finalDate,
        opened_at: finalOpened
      })
      .select()
      .single();

    if (error) {
      console.error(error);
      return;
    }

    // Lokal einfügen
    const item = items.value.find(i => i.id === itemId);
    if (item && data) {
      item.instances.push(data);
      // Neu sortieren
      item.instances.sort((a, b) => {
        if (!a.expiry_date) return 1;
        if (!b.expiry_date) return -1;
        return new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime();
      });
    }
  };

  // 4. UPDATE QUANTITY (Einer spezifischen Instanz)
  const updateInstanceDetails = async (
    itemId: string,
    instanceId: string,
    updates: { quantity?: number, opened_at?: string | null }
  ) => {
    const item = items.value.find(i => i.id === itemId);
    const instance = item?.instances.find(inst => inst.id === instanceId);
    if (!item || !instance) return;

    // Optimistisch Update
    if (updates.quantity !== undefined) instance.quantity = updates.quantity;
    if (updates.opened_at !== undefined) instance.opened_at = updates.opened_at;

    const { error } = await supabase
      .from('item_instances')
      .update(updates)
      .eq('id', instanceId);

    if (error) {
      console.error('Fehler beim Update:', error);
      // Hier könnte man ein Rollback implementieren
      alert('Speichern fehlgeschlagen');
    } else {
      // SUCCESS: Check Automation
      if (item.minimum_stock !== null && updates.quantity !== undefined) {
        const totalQuantity = item.instances.reduce((acc, curr) => acc + curr.quantity, 0);
        if (totalQuantity < item.minimum_stock) {
          // Check if already on list? (Optional, but good UX)
          // We just Fire & Forget insert. If duplicates are allowed, it adds another. 
          // If unique constraint on title, it might fail silently or error.
          // Assumption: duplicates allowed or acceptable for now.

          // Notify User
          alert(`⚠️ Achtung! "${item.name}" ist knapp (${totalQuantity} übrig). Wurde auf die Einkaufsliste gesetzt.`);

          await supabase.from('shopping_list').insert({ title: item.name });
        }
      }
    }
  };

  // 5. LÖSCHEN (Instanz oder ganzes Item)
  const deleteInstance = async (itemId: string, instanceId: string) => {
    const item = items.value.find(i => i.id === itemId);
    if (!item) return;

    // Optimistisch löschen
    const prevInstances = [...item.instances];
    item.instances = item.instances.filter(inst => inst.id !== instanceId);

    // DB Löschen
    const { error } = await supabase.from('item_instances').delete().eq('id', instanceId);

    if (error) {
      item.instances = prevInstances; // Rollback
      return;
    }

    // Wenn das Item jetzt KEINE Instanzen mehr hat, löschen wir das Parent-Item auch
    if (item.instances.length === 0) {
      await supabase.from('items').delete().eq('id', itemId);
      items.value = items.value.filter(i => i.id !== itemId);
    }
  };

  // --- Helper ---
  const addLocation = async (name: string, icon: string) => { /* ... wie vorher ... */
    const { data } = await supabase.from('locations').insert({ name, icon }).select().single();
    if (data) locations.value.push(data);
  };

  const addCategory = async (name: string, locationId: string) => { /* ... wie vorher ... */
    const { data } = await supabase.from('categories').insert({ name, location_id: locationId }).select().single();
    if (data) { categories.value.push(data); return data; }
  };

  const deleteCategory = async (catId: string) => { /* ... wie vorher ... */
    // Check muss angepasst werden: Item hat keine category_id mehr direkt (doch hat es, siehe Interface)
    // Aber Check ob Item existiert ist gleich
    const hasItems = items.value.some(i => i.category_id === catId);
    if (hasItems) { alert('Kategorie nicht leer!'); return false; }
    await supabase.from('categories').delete().eq('id', catId);
    categories.value = categories.value.filter(c => c.id !== catId);
    return true;
  };

  // Getter (Filterlogik fast identisch, nur quantity berechnung anders)
  const getLocationName = (locId: string) => locations.value.find(l => l.id === locId)?.name || '';

  const getItemsByLocation = (locId: string) => computed(() => {
    const locItems = items.value.filter(i => i.location_id === locId);
    const uncategorized = locItems.filter(i => !i.category_id);
    const locCategories = categories.value.filter(c => c.location_id === locId);
    const grouped = locCategories.map(cat => ({
      ...cat,
      items: locItems.filter(i => i.category_id === cat.id)
    })).filter(group => group.items.length > 0);
    return { uncategorized, grouped };
  });

  const searchItems = (query: string) => {
    if (!query) return [];
    return items.value.filter(i => i.name.toLowerCase().includes(query.toLowerCase()));
  };

  const updateLocation = async (id: string, name: string, icon: string) => {
    // Optimistisch lokal updaten
    const loc = locations.value.find(l => l.id === id);
    const oldName = loc?.name;
    const oldIcon = loc?.icon;

    if (loc) {
      loc.name = name;
      loc.icon = icon;
    }

    const { error } = await supabase
      .from('locations')
      .update({ name, icon })
      .eq('id', id);

    if (error) {
      console.error('Update fehlgeschlagen', error);
      alert('Konnte Ort nicht aktualisieren');
      // Rollback
      if (loc) {
        loc.name = oldName!;
        loc.icon = oldIcon!;
      }
    }
  };

  // NEU: Ort löschen
  const deleteLocation = async (id: string) => {
    // 1. Lokal entfernen
    const prevLocs = [...locations.value];
    locations.value = locations.value.filter(l => l.id !== id);

    // Auch die Items lokal entfernen, damit die "Alle Produkte" Liste stimmt
    const prevItems = [...items.value];
    items.value = items.value.filter(i => i.location_id !== id);

    // 2. DB Request
    // WICHTIG: Da wir beim Erstellen der Tabellen "ON DELETE CASCADE" genutzt haben,
    // löscht Supabase automatisch alle Items und Kategorien in diesem Ort.
    const { error } = await supabase
      .from('locations')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Löschen fehlgeschlagen', error);
      alert('Konnte Ort nicht löschen.');
      // Rollback
      locations.value = prevLocs;
      items.value = prevItems;
    }
  };

  const updateItem = async (itemId: string, newName: string, newCategoryId: string | null, newMinimumStock: number | null) => {
    const item = items.value.find(i => i.id === itemId);
    if (!item) return;

    // Optimistisches Update
    const oldName = item.name;
    const oldCat = item.category_id;

    item.name = newName;
    item.category_id = newCategoryId;
    item.minimum_stock = newMinimumStock;

    const { error } = await supabase
      .from('items')
      .update({ name: newName, category_id: newCategoryId, minimum_stock: newMinimumStock })
      .eq('id', itemId);

    if (error) {
      console.error('Update fehlgeschlagen:', error);
      alert('Konnte Item nicht aktualisieren.');
      // Rollback
      item.name = oldName;
      item.category_id = oldCat;
    }
  };

  return {
    locations, items, categories, loading,
    fetchInventory, addLocation, addCategory, deleteCategory, addItem,
    addInstance, updateInstanceDetails, deleteInstance, // <-- Neue Actions
    getItemsByLocation, searchItems, getLocationName,
    updateLocation, deleteLocation, updateItem
  };
}