// src/composables/useInventory.ts
import { ref, computed } from 'vue';
import { supabase } from '../supabase';

// Typen passend zur DB
export interface Location {
  id: string;
  name: string;
  icon: string | null;
}

export interface Category {
  id: string;
  name: string;
  location_id: string; // Achtung: Supabase nutzt snake_case (mit Unterstrich)
}

export interface Item {
  id: string;
  name: string;
  quantity: number;
  location_id: string;
  category_id: string | null;
  expiry_date?: string | null;
}

// Globaler State (damit Daten erhalten bleiben, wenn man Views wechselt)
const locations = ref<Location[]>([]);
const categories = ref<Category[]>([]);
const items = ref<Item[]>([]);
const loading = ref(false);

export function useInventory() {

  // 1. Alle Daten laden
  const fetchInventory = async () => {
    try {
      loading.value = true;
      
      // Wir laden alles parallel für maximale Geschwindigkeit
      const [locRes, catRes, itemRes] = await Promise.all([
        supabase.from('locations').select('*').order('name'),
        supabase.from('categories').select('*').order('name'),
        supabase.from('items').select('*').order('name')
      ]);

      if (locRes.error) throw locRes.error;
      if (catRes.error) throw catRes.error;
      if (itemRes.error) throw itemRes.error;

      locations.value = locRes.data || [];
      categories.value = catRes.data || [];
      items.value = itemRes.data || [];
      
    } catch (error) {
      console.error('Fehler beim Laden:', error);
    } finally {
      loading.value = false;
    }
  };

  const deleteItem = async (itemId: string) => {
    // Optimistisch: Sofort aus der lokalen Liste entfernen
    const index = items.value.findIndex(i => i.id === itemId);
    const deletedItem = items.value[index]; // Backup für Fehlerfall
    if (index !== -1) {
      items.value.splice(index, 1);
    }

    // DB Request
    const { error } = await supabase
      .from('items')
      .delete()
      .eq('id', itemId);

    if (error) {
      console.error('Löschen fehlgeschlagen:', error);
      alert('Fehler beim Löschen!');
      // Rollback: Item wieder einfügen
      if (deletedItem) items.value.splice(index, 0, deletedItem);
    }
  };

  // 2. UPDATE: updateQuantity korrigieren
  // Wir übergeben jetzt den NEUEN ABSOLUTEN WERT, nicht mehr die Differenz
  const updateQuantity = async (itemId: string, newQuantity: number) => {
    const item = items.value.find(i => i.id === itemId);
    if (!item) return;

    const oldQuantity = item.quantity;
    
    // Optimistisches Update
    item.quantity = newQuantity;

    const { error } = await supabase
      .from('items')
      .update({ quantity: newQuantity })
      .eq('id', itemId);

    if (error) {
      console.error('Update fehlgeschlagen:', error);
      item.quantity = oldQuantity; // Rollback
    }
  };

  // 3. Getter und Suchlogik (Fast gleich wie vorher)
  const getLocationName = (locId: string) => {
    return locations.value.find(l => l.id === locId)?.name || 'Unbekannt';
  };

  const getItemsByLocation = (locId: string) => {
    return computed(() => {
      const locItems = items.value.filter(i => i.location_id === locId);
      
      // Items ohne Kategorie
      const uncategorized = locItems.filter(i => !i.category_id);
      
      // Items gruppiert nach Kategorie
      const locCategories = categories.value.filter(c => c.location_id === locId);
      const grouped = locCategories.map(cat => ({
        ...cat,
        items: locItems.filter(i => i.category_id === cat.id)
      })).filter(group => group.items.length > 0);

      return { uncategorized, grouped };
    });
  };

  const searchItems = (query: string) => {
    if (!query) return [];
    const lowerQuery = query.toLowerCase();
    return items.value.filter(i => i.name.toLowerCase().includes(lowerQuery));
  };

  const addLocation = async (name: string, icon: string) => {
    // 1. Validierung
    if (!name.trim()) return;

    // 2. An DB senden
    const { data, error } = await supabase
      .from('locations')
      .insert({ name, icon }) // user_id wird automatisch durch Supabase gesetzt
      .select()
      .single();

    if (error) {
      console.error('Fehler beim Erstellen:', error);
      alert('Konnte Ort nicht erstellen.');
      return;
    }

    // 3. Lokalen State aktualisieren (damit es sofort sichtbar ist)
    if (data) {
      locations.value.push(data);
    }
  };

  const addCategory = async (name: string, locationId: string) => {
    const { data, error } = await supabase
      .from('categories')
      .insert({ name, location_id: locationId })
      .select()
      .single();

    if (error) {
      console.error('Fehler beim Erstellen der Kategorie:', error);
      throw error;
    }

    if (data) {
      categories.value.push(data); // Lokal hinzufügen
      return data;
    }
  };

  const deleteCategory = async (categoryId: string) => {
    // 1. Prüfen: Gibt es Items in dieser Kategorie?
    // Wir schauen in unser lokales Array, das ist am schnellsten.
    const hasItems = items.value.some(i => i.category_id === categoryId);
    
    if (hasItems) {
      alert('Diese Kategorie ist nicht leer! Bitte erst die Artikel löschen oder verschieben.');
      return false; // Fehler
    }

    // 2. Bestätigung
    if (!confirm('Kategorie wirklich löschen?')) return false;

    // 3. Optimistisch löschen (Lokal)
    const prevCats = [...categories.value];
    categories.value = categories.value.filter(c => c.id !== categoryId);

    // 4. DB Request
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', categoryId);

    if (error) {
      console.error('Fehler beim Löschen der Kategorie:', error);
      alert('Fehler beim Löschen.');
      categories.value = prevCats; // Rollback
      return false;
    }
    
    return true; // Erfolg
  };

  // NEU: Item mit Anzahl und Ablaufdatum erstellen
  const addItem = async (
    name: string, 
    locationId: string, 
    categoryId: string | null,
    quantity: number,      // Neuer Parameter
    expiryDate: string | null // Neuer Parameter
  ) => {
    
    // Leeren String zu null umwandeln für die DB
    const finalDate = expiryDate === '' ? null : expiryDate;

    const { data, error } = await supabase
      .from('items')
      .insert({ 
        name, 
        location_id: locationId, 
        category_id: categoryId,
        quantity: quantity,     // Wert aus Parameter nutzen
        expiry_date: finalDate  // Wert aus Parameter nutzen
      })
      .select()
      .single();

    if (error) {
      console.error('Fehler beim Erstellen des Artikels:', error);
      alert('Konnte Artikel nicht speichern.');
      return;
    }

    if (data) {
      items.value.push(data);
    }
  };

  return {
    categories,
    locations,
    items,
    loading,
    fetchInventory,
    updateQuantity,
    getItemsByLocation,
    searchItems,
    getLocationName,
    addLocation,
    addItem,
    addCategory,
    deleteCategory,
    deleteItem
  };
}