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

  // 2. Anzahl ändern (mit Datenbank-Update)
  const updateQuantity = async (itemId: string, newAmount: number) => {
    // Finde das Item im lokalen State
    const item = items.value.find(i => i.id === itemId);
    if (!item) return;

    // Optimistisches Update (sofort im UI anzeigen)
    const oldAmount = item.quantity;
    item.quantity = newAmount;

    // Update an DB senden
    const { error } = await supabase
      .from('items')
      .update({ quantity: newAmount })
      .eq('id', itemId);

    // Rollback bei Fehler
    if (error) {
      console.error('Update fehlgeschlagen:', error);
      item.quantity = oldAmount; // Zurücksetzen
      alert('Konnte nicht speichern!');
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

  return {
    locations,
    items,
    loading,
    fetchInventory,
    updateQuantity,
    getItemsByLocation,
    searchItems,
    getLocationName,
    addLocation
  };
}