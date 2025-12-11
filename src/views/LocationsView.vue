<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useInventory, type Location } from '../composables/useInventory';

const { locations, addLocation, updateLocation, deleteLocation } = useInventory();
const router = useRouter();

// --- Navigation ---
const openLocation = (loc: Location) => {
  router.push({ name: 'location', params: { id: loc.id } });
};

// --- Modal Logic (Add/Edit Location) ---
const addLocationDialog = ref<HTMLDialogElement | null>(null);
const editingLocationId = ref<string | null>(null);
const newLocName = ref('');
const newLocIcon = ref('📦');
const availableIcons = ['❄️', '🥫', '📦', '🧹', '🛁', '💊', '🍷', '🥖', '🍎', '🥩', '🧊', '🧺'];

const openAddLocationModal = () => {
  editingLocationId.value = null;
  newLocName.value = '';
  newLocIcon.value = '📦';
  addLocationDialog.value?.showModal();
};

const openEditLocationModal = (loc: Location, event: Event) => {
  event.stopPropagation();
  editingLocationId.value = loc.id;
  newLocName.value = loc.name;
  newLocIcon.value = loc.icon || '📦';
  addLocationDialog.value?.showModal();
};

const saveNewLocation = async () => {
  if (!newLocName.value) return;
  if (editingLocationId.value) {
    await updateLocation(editingLocationId.value, newLocName.value, newLocIcon.value);
  } else {
    await addLocation(newLocName.value, newLocIcon.value);
  }
  addLocationDialog.value?.close();
};

const initiateDeleteLocation = async () => {
  if (!editingLocationId.value) return;
  if (!confirm('Ort wirklich löschen? Alle enthaltenen Produkte werden ebenfalls gelöscht.')) return;
  
  await deleteLocation(editingLocationId.value);
  addLocationDialog.value?.close();
};
</script>

<template>
  <div class="grid grid-cols-2 gap-4">
    <div 
      v-for="loc in locations" 
      :key="loc.id" 
      @click="openLocation(loc)"
      class="card bg-base-100 shadow-md hover:shadow-lg cursor-pointer active:scale-95 transition-transform relative group"
    >
      <div class="card-body items-center text-center p-6">
        <div class="text-4xl mb-2">{{ loc.icon || '📦' }}</div>
        <h2 class="card-title text-base">{{ loc.name }}</h2>
      </div>

      <button 
        @click="(e) => openEditLocationModal(loc, e)"
        class="btn btn-xs btn-circle btn-ghost absolute top-2 right-2 opacity-50 hover:opacity-100 bg-base-200/50 hover:bg-base-300 border-none"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
      </button>
    </div>

    <button 
      @click="openAddLocationModal"
      class="card border-2 border-dashed border-base-300 bg-base-100/50 hover:bg-base-100 flex items-center justify-center p-6 cursor-pointer h-full min-h-[140px]"
    >
      <div class="text-center text-base-content/60">
        <div class="text-3xl mb-1">+</div>
        <div class="font-medium">Ort hinzufügen</div>
      </div>
    </button>

    <dialog ref="addLocationDialog" class="modal modal-bottom sm:modal-middle">
      <div class="modal-box">
        <h3 class="font-bold text-lg mb-4">
          {{ editingLocationId ? 'Ort bearbeiten' : 'Neuen Ort erstellen' }}
        </h3>
        <div class="form-control w-full mb-4">
          <input v-model="newLocName" type="text" placeholder="Name" class="input input-bordered w-full" @keyup.enter="saveNewLocation"/>
        </div>
        <div class="grid grid-cols-6 gap-2 mb-6">
          <button v-for="icon in availableIcons" :key="icon" @click="newLocIcon = icon" class="btn btn-square text-xl" :class="newLocIcon === icon ? 'btn-primary' : 'btn-ghost bg-base-200'" type="button">{{ icon }}</button>
        </div>
        <div class="modal-action justify-between">
          <div>
            <button v-if="editingLocationId" @click="initiateDeleteLocation" class="btn btn-ghost text-error hover:bg-error/10">Löschen</button>
          </div>
          <div class="flex gap-2">
            <form method="dialog"><button class="btn btn-ghost">Abbrechen</button></form>
            <button @click="saveNewLocation" class="btn btn-primary">{{ editingLocationId ? 'Speichern' : 'Erstellen' }}</button>
          </div>
        </div>
      </div>
    </dialog>
  </div>
</template>