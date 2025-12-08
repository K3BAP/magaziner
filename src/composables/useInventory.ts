// src/composables/useInventory.ts
import { ref, computed } from 'vue';

// --- Typen (später kommen die aus Supabase) ---
export interface Location {
  id: string;
  name: string;
  icon: string; // Emoji für den Anfang
}

export interface Category {
  id: string;
  name: string;
  locationId: string;
}

export interface Item {
  id: string;
  name: string;
  quantity: number;
  locationId: string;
  categoryId?: string; // Optional
}

// --- Mock Daten (Simulierte DB) ---
const locations = ref<Location[]>([
  { id: '1', name: 'Kühlschrank', icon: '❄️' },
  { id: '2', name: 'Vorratsschrank', icon: '🥫' },
  { id: '3', name: 'Keller', icon: '📦' },
]);

const categories = ref<Category[]>([
  { id: 'c1', name: 'Oberes Fach', locationId: '1' },
  { id: 'c2', name: 'Gemüsefach', locationId: '1' },
  { id: 'c3', name: 'Gewürze', locationId: '2' },
]);

const items = ref<Item[]>([
  { id: 'i1', name: 'Milch', quantity: 2, locationId: '1', categoryId: 'c1' },
  { id: 'i1', name: 'Baum', quantity: 2, locationId: '1', categoryId: 'c1' },
  { id: 'i2', name: 'Karotten', quantity: 5, locationId: '1', categoryId: 'c2' },
  { id: 'i3', name: 'Butter', quantity: 1, locationId: '1' }, // Keine Kategorie
  { id: 'i4', name: 'Nudeln', quantity: 3, locationId: '2' },
  { id: 'i5', name: 'Mineralwasser', quantity: 6, locationId: '3' },
]);

// --- Logik ---
export function useInventory() {
  
  // Anzahl ändern
  const updateQuantity = (itemId: string, amount: number) => {
    const item = items.value.find(i => i.id === itemId);
    if (item) {
      item.quantity += amount;
      if (item.quantity < 0) item.quantity = 0;
    }
  };

  // Helper: Items für einen Ort holen (inkl. Gruppierung)
  const getItemsByLocation = (locId: string) => {
    return computed(() => {
      const locItems = items.value.filter(i => i.locationId === locId);
      
      // 1. Items ohne Kategorie
      const uncategorized = locItems.filter(i => !i.categoryId);
      
      // 2. Items gruppiert nach Kategorie
      const locCategories = categories.value.filter(c => c.locationId === locId);
      const grouped = locCategories.map(cat => ({
        ...cat,
        items: locItems.filter(i => i.categoryId === cat.id)
      })).filter(group => group.items.length > 0); // Leere Kategorien ausblenden

      return { uncategorized, grouped };
    });
  };

  // Suche
  const searchItems = (query: string) => {
    if (!query) return [];
    const lowerQuery = query.toLowerCase();
    return items.value.filter(i => i.name.toLowerCase().includes(lowerQuery));
  };

  // Name des Ortes finden (für die Suche)
  const getLocationName = (locId: string) => {
    return locations.value.find(l => l.id === locId)?.name || 'Unbekannt';
  };

  return {
    locations,
    items,
    updateQuantity,
    getItemsByLocation,
    searchItems,
    getLocationName
  };
}