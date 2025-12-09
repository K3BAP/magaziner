<script setup lang="ts">
import { ref, computed } from 'vue';
import type { Item } from '../composables/useInventory';
import { useInventory } from '../composables/useInventory';

const props = defineProps<{ item: Item; showLocation?: boolean }>();
const { updateQuantity, getLocationName, deleteItem } = useInventory(); // deleteItem dazu holen

// State für den Lösch-Dialog
const showDeleteDialog = ref(false);
const confirmDialog = ref<HTMLDialogElement | null>(null);

// --- Button Logik ---
const handleIncrement = () => {
  // Einfach +1 rechnen
  updateQuantity(props.item.id, props.item.quantity + 1);
};

const handleDecrement = () => {
  const newQty = props.item.quantity - 1;
  
  if (newQty <= 0) {
    // Wenn 0 erreicht wird -> Dialog öffnen
    confirmDialog.value?.showModal();
  } else {
    // Sonst einfach reduzieren
    updateQuantity(props.item.id, newQty);
  }
};

const confirmDelete = () => {
  deleteItem(props.item.id);
  confirmDialog.value?.close();
};

// --- Formatierung (Datum & Farben) wie vorher ---
const formattedDate = computed(() => {
  if (!props.item.expiry_date) return null;
  const date = new Date(props.item.expiry_date);
  return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
});

const expiryStatus = computed(() => {
  if (!props.item.expiry_date) return 'ok';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(props.item.expiry_date);
  const diffTime = expiry.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return 'expired';
  if (diffDays <= 7) return 'warning';
  return 'ok';
});

const expiryClass = computed(() => {
  switch (expiryStatus.value) {
    case 'expired': return 'text-error font-bold';
    case 'warning': return 'text-warning font-bold';
    default: return 'text-gray-400';
  }
});
</script>

<template>
  <div class="flex items-center justify-between p-3 bg-base-100 border-b border-base-200 last:border-0">
    
    <div class="flex-1 min-w-0 pr-2">
      <div class="font-medium text-lg truncate">{{ item.name }}</div>
      <div class="flex flex-wrap gap-2 text-xs mt-1">
        <span v-if="showLocation" class="badge badge-ghost badge-sm gap-1">
          📍 {{ getLocationName(item.location_id) }}
        </span>
        <span v-if="item.expiry_date" :class="expiryClass" class="flex items-center gap-1">
          <span v-if="expiryStatus === 'expired'">⚠️</span>
          <span v-else>⏳</span>
          {{ formattedDate }}
        </span>
      </div>
    </div>

    <div class="flex items-center gap-3 flex-none">
      <span class="font-bold text-xl w-8 text-center">{{ item.quantity }}</span>

      <div class="join">
        <button 
          @click="handleDecrement" 
          class="btn btn-sm btn-square join-item hover:bg-error hover:text-white transition-colors"
        >
          -
        </button>
        
        <button 
          @click="handleIncrement" 
          class="btn btn-sm btn-square join-item btn-primary"
        >
          +
        </button>
      </div>
    </div>

    <dialog ref="confirmDialog" class="modal modal-bottom sm:modal-middle text-left">
      <div class="modal-box">
        <h3 class="font-bold text-lg text-error">Artikel aufbrauchen?</h3>
        <p class="py-4">
          Möchtest du <strong>{{ item.name }}</strong> wirklich entfernen? <br>
          Der Bestand ist dann auf 0.
        </p>
        <div class="modal-action">
          <form method="dialog">
            <button class="btn btn-ghost">Abbrechen</button>
          </form>
          <button @click="confirmDelete" class="btn btn-error">Ja, entfernen</button>
        </div>
      </div>
    </dialog>

  </div>
</template>