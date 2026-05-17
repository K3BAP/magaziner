<script setup lang="ts">
import { ref } from 'vue';
import { useHouseholds } from '../../composables/useHouseholds';
import { useActiveHousehold } from '../../composables/useActiveHousehold';
import {
  HomeIcon,
  PlusIcon,
  CheckCircleIcon,
  PencilSquareIcon,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/vue/24/outline';

const {
  households,
  createHousehold,
  switchHousehold,
  renameHousehold,
  deleteHousehold,
} = useHouseholds();
const { activeHouseholdId } = useActiveHousehold();

const showCreate = ref(false);
const newName = ref('');
const creating = ref(false);
const errorMsg = ref<string | null>(null);

// Per-row edit state for inline rename
const editingId = ref<string | null>(null);
const editName = ref('');
const savingEdit = ref(false);

// Per-row delete confirmation state
const confirmingDeleteId = ref<string | null>(null);
const deleting = ref(false);

const onSwitch = async (id: string) => {
  if (id === activeHouseholdId.value) return;
  if (editingId.value || confirmingDeleteId.value) return;
  try {
    await switchHousehold(id);
  } catch (e: any) {
    errorMsg.value = e?.message ?? 'Wechsel fehlgeschlagen.';
  }
};

const onCreate = async () => {
  const name = newName.value.trim();
  if (!name) return;
  creating.value = true;
  errorMsg.value = null;
  try {
    await createHousehold(name);
    showCreate.value = false;
    newName.value = '';
  } catch (e: any) {
    errorMsg.value = e?.message ?? 'Anlegen fehlgeschlagen.';
  } finally {
    creating.value = false;
  }
};

const startEdit = (id: string, currentName: string) => {
  confirmingDeleteId.value = null;
  editingId.value = id;
  editName.value = currentName;
  errorMsg.value = null;
};

const cancelEdit = () => {
  editingId.value = null;
  editName.value = '';
};

const saveEdit = async () => {
  if (!editingId.value) return;
  const name = editName.value.trim();
  if (!name) return;
  savingEdit.value = true;
  errorMsg.value = null;
  try {
    await renameHousehold(editingId.value, name);
    cancelEdit();
  } catch (e: any) {
    errorMsg.value = e?.message ?? 'Umbenennen fehlgeschlagen.';
  } finally {
    savingEdit.value = false;
  }
};

const requestDelete = (id: string) => {
  editingId.value = null;
  confirmingDeleteId.value = id;
  errorMsg.value = null;
};

const cancelDelete = () => {
  confirmingDeleteId.value = null;
};

const confirmDelete = async () => {
  if (!confirmingDeleteId.value) return;
  deleting.value = true;
  errorMsg.value = null;
  try {
    await deleteHousehold(confirmingDeleteId.value);
    confirmingDeleteId.value = null;
  } catch (e: any) {
    errorMsg.value = e?.message ?? 'Löschen fehlgeschlagen.';
  } finally {
    deleting.value = false;
  }
};
</script>

<template>
  <div class="flex flex-col gap-2">
    <ul class="flex flex-col gap-2">
      <li v-for="h in households" :key="h.id" class="flex flex-col gap-2">
        <!-- Row: switch + inline action buttons (owners only) -->
        <div
          class="flex items-stretch rounded-xl border overflow-hidden transition-all"
          :class="h.id === activeHouseholdId
            ? 'bg-primary/10 border-primary'
            : 'bg-base-100 border-base-300 hover:border-primary/60'"
        >
          <button
            type="button"
            class="flex-1 flex items-center gap-3 p-3 text-left min-w-0"
            @click="onSwitch(h.id)"
          >
            <div class="w-10 h-10 rounded-full bg-base-200 flex items-center justify-center shrink-0">
              <HomeIcon class="h-5 w-5 text-base-content/60" />
            </div>
            <div class="min-w-0 flex-1">
              <div class="font-semibold truncate">{{ h.name }}</div>
              <div class="text-xs text-base-content/50">
                {{ h.role === 'owner' ? 'Inhaber:in' : 'Mitglied' }}
              </div>
            </div>
            <CheckCircleIcon
              v-if="h.id === activeHouseholdId"
              class="h-6 w-6 text-primary shrink-0"
            />
          </button>

          <div
            v-if="h.role === 'owner'"
            class="flex items-center gap-1 px-2 border-l border-base-300/60"
            @click.stop
          >
            <button
              type="button"
              class="btn btn-xs btn-ghost btn-circle"
              title="Umbenennen"
              aria-label="Umbenennen"
              @click="startEdit(h.id, h.name)"
            >
              <PencilSquareIcon class="h-4 w-4" />
            </button>
            <button
              type="button"
              class="btn btn-xs btn-ghost btn-circle text-error hover:bg-error hover:text-error-content"
              :disabled="households.length <= 1"
              :title="households.length <= 1 ? 'Letzter Haushalt kann nicht gelöscht werden' : 'Löschen'"
              aria-label="Löschen"
              @click="requestDelete(h.id)"
            >
              <TrashIcon class="h-4 w-4" />
            </button>
          </div>
        </div>

        <!-- Rename panel -->
        <div
          v-if="editingId === h.id"
          class="p-3 rounded-xl border border-base-300 bg-base-100 flex flex-col gap-2"
        >
          <label class="text-xs font-semibold uppercase tracking-wider text-base-content/60">
            Haushalt umbenennen
          </label>
          <input
            v-model="editName"
            type="text"
            class="input input-bordered input-sm w-full"
            :disabled="savingEdit"
            @keyup.enter="saveEdit"
            autofocus
          />
          <div class="flex justify-end gap-2">
            <button type="button" class="btn btn-ghost btn-sm" :disabled="savingEdit" @click="cancelEdit">
              Abbrechen
            </button>
            <button
              type="button"
              class="btn btn-primary btn-sm"
              :disabled="savingEdit || !editName.trim() || editName.trim() === h.name"
              @click="saveEdit"
            >
              <span v-if="savingEdit" class="loading loading-spinner loading-xs" />
              Speichern
            </button>
          </div>
        </div>

        <!-- Delete confirmation panel -->
        <div
          v-if="confirmingDeleteId === h.id"
          class="p-3 rounded-xl border border-error/40 bg-error/5 flex flex-col gap-2"
        >
          <div class="flex items-start gap-2">
            <TrashIcon class="h-5 w-5 text-error shrink-0 mt-0.5" />
            <div class="text-sm">
              <div class="font-semibold">Haushalt „{{ h.name }}" wirklich löschen?</div>
              <div class="text-xs text-base-content/70 mt-1">
                Alle Vorräte, Aufgaben, Einkaufsliste, Rezepte und Finanzdaten
                dieses Haushalts werden unwiderruflich entfernt.
              </div>
            </div>
          </div>
          <div class="flex justify-end gap-2">
            <button type="button" class="btn btn-ghost btn-sm" :disabled="deleting" @click="cancelDelete">
              <XMarkIcon class="h-4 w-4" />
              Abbrechen
            </button>
            <button
              type="button"
              class="btn btn-error btn-sm"
              :disabled="deleting"
              @click="confirmDelete"
            >
              <span v-if="deleting" class="loading loading-spinner loading-xs" />
              <TrashIcon v-else class="h-4 w-4" />
              Endgültig löschen
            </button>
          </div>
        </div>
      </li>
    </ul>

    <!-- Create new household -->
    <button
      v-if="!showCreate"
      type="button"
      class="btn btn-outline btn-primary btn-sm gap-1 self-start mt-2"
      @click="showCreate = true"
    >
      <PlusIcon class="h-4 w-4" />
      Neuer Haushalt
    </button>

    <div v-else class="mt-2 p-3 rounded-xl border border-base-300 bg-base-100 flex flex-col gap-2">
      <input
        v-model="newName"
        type="text"
        placeholder="z.B. Zweitwohnung"
        class="input input-bordered input-sm w-full"
        :disabled="creating"
        @keyup.enter="onCreate"
      />
      <div class="flex justify-end gap-2">
        <button
          type="button"
          class="btn btn-ghost btn-sm"
          :disabled="creating"
          @click="showCreate = false; newName = ''; errorMsg = null"
        >
          Abbrechen
        </button>
        <button
          type="button"
          class="btn btn-primary btn-sm"
          :disabled="creating || !newName.trim()"
          @click="onCreate"
        >
          <span v-if="creating" class="loading loading-spinner loading-xs" />
          Erstellen
        </button>
      </div>
    </div>

    <p v-if="errorMsg" class="text-xs text-error">{{ errorMsg }}</p>
  </div>
</template>
