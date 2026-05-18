<script setup lang="ts">
import { ref, watch } from 'vue';
import { useHouseholds } from '../../composables/useHouseholds';
import { useActiveHousehold } from '../../composables/useActiveHousehold';
import { useHouseholdMembers } from '../../composables/useHouseholdMembers';
import { useInvites } from '../../composables/useInvites';
import { useAuth } from '../../composables/useAuth';
import {
  HomeIcon,
  PlusIcon,
  CheckCircleIcon,
  PencilSquareIcon,
  TrashIcon,
  XMarkIcon,
  ChevronDownIcon,
  UserIcon,
  ClipboardIcon,
  CheckIcon,
  ArrowPathIcon,
  LinkIcon,
  UserMinusIcon,
} from '@heroicons/vue/24/outline';

const {
  households,
  createHousehold,
  switchHousehold,
  renameHousehold,
  deleteHousehold,
} = useHouseholds();
const { activeHouseholdId } = useActiveHousehold();
const { membersByHousehold, fetchMembers, removeMember } = useHouseholdMembers();
const {
  invitesByHousehold,
  fetchActiveInvite,
  createInvite,
  revokeInvite,
  inviteUrlFor,
} = useInvites();
const { user } = useAuth();

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

// Per-row expanded "members + invite" panel
const expandedId = ref<string | null>(null);

// Per-row invite mutation flags
const invitingId = ref<string | null>(null);
const copiedToken = ref<string | null>(null);

// Per-row kick confirmation: { hhId, userId }
const confirmingKick = ref<{ hhId: string; userId: string } | null>(null);
const kicking = ref(false);

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

// --- Details panel (members + invite) ---

const toggleExpanded = async (id: string, role: 'owner' | 'member') => {
  if (expandedId.value === id) {
    expandedId.value = null;
    return;
  }
  expandedId.value = id;
  errorMsg.value = null;

  // Lazy-load on first expand.
  if (!membersByHousehold.value[id]) {
    await fetchMembers(id);
  }
  if (role === 'owner' && invitesByHousehold.value[id] === undefined) {
    await fetchActiveInvite(id);
  }
};

const initials = (name: string) =>
  name.trim().length > 0 ? name.trim()[0].toUpperCase() : '?';

// --- Invite link ---

const onCreateInvite = async (id: string) => {
  invitingId.value = id;
  errorMsg.value = null;
  try {
    await createInvite(id);
  } catch (e: any) {
    errorMsg.value = e?.message ?? 'Einladung konnte nicht erstellt werden.';
  } finally {
    invitingId.value = null;
  }
};

const onRegenerateInvite = onCreateInvite; // semantically the same RPC

const onRevokeInvite = async (id: string) => {
  const invite = invitesByHousehold.value[id];
  if (!invite) return;
  invitingId.value = id;
  errorMsg.value = null;
  try {
    await revokeInvite(invite);
  } catch (e: any) {
    errorMsg.value = e?.message ?? 'Einladung konnte nicht widerrufen werden.';
  } finally {
    invitingId.value = null;
  }
};

const copyInviteUrl = async (token: string) => {
  const url = inviteUrlFor(token);
  try {
    await navigator.clipboard.writeText(url);
    copiedToken.value = token;
    setTimeout(() => {
      if (copiedToken.value === token) copiedToken.value = null;
    }, 1500);
  } catch {
    errorMsg.value = 'Konnte nicht in die Zwischenablage kopieren.';
  }
};

// --- Kick / leave a member ---

const requestKick = (hhId: string, userId: string) => {
  confirmingKick.value = { hhId, userId };
};
const cancelKick = () => { confirmingKick.value = null; };

const confirmKick = async () => {
  if (!confirmingKick.value) return;
  const { hhId, userId } = confirmingKick.value;
  kicking.value = true;
  errorMsg.value = null;
  try {
    await removeMember(hhId, userId);
    confirmingKick.value = null;
  } catch (e: any) {
    errorMsg.value = e?.message ?? 'Mitglied konnte nicht entfernt werden.';
  } finally {
    kicking.value = false;
  }
};

// Collapse all panels when the household list changes underneath us
// (e.g. after deleting one).
watch(households, (list) => {
  if (expandedId.value && !list.some(h => h.id === expandedId.value)) {
    expandedId.value = null;
  }
});
</script>

<template>
  <div class="flex flex-col gap-2">
    <ul class="flex flex-col gap-2">
      <li v-for="h in households" :key="h.id" class="flex flex-col gap-2">
        <!-- Row: switch + inline action buttons -->
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
            class="flex items-center gap-1 px-2 border-l border-base-300/60"
            @click.stop
          >
            <button
              type="button"
              class="btn btn-xs btn-ghost btn-circle"
              :class="expandedId === h.id ? 'bg-base-200' : ''"
              title="Mitglieder & Einladung"
              aria-label="Mitglieder & Einladung"
              @click="toggleExpanded(h.id, h.role)"
            >
              <ChevronDownIcon
                class="h-4 w-4 transition-transform"
                :class="expandedId === h.id ? 'rotate-180' : ''"
              />
            </button>
            <template v-if="h.role === 'owner'">
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
            </template>
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

        <!-- Details panel: members + invite link -->
        <div
          v-if="expandedId === h.id"
          class="p-3 rounded-xl border border-base-300 bg-base-100 flex flex-col gap-4"
        >
          <!-- Members -->
          <div>
            <div class="text-xs font-semibold uppercase tracking-wider text-base-content/60 mb-2">
              Mitglieder
            </div>

            <ul v-if="membersByHousehold[h.id]?.length" class="flex flex-col gap-1.5">
              <li
                v-for="m in membersByHousehold[h.id]"
                :key="m.user_id"
                class="flex items-center gap-3 p-2 rounded-lg hover:bg-base-200/60"
              >
                <div class="w-8 h-8 rounded-full bg-base-200 flex items-center justify-center shrink-0 overflow-hidden">
                  <img v-if="m.avatar_url" :src="m.avatar_url" alt="" class="w-full h-full object-cover" />
                  <span v-else-if="m.display_name?.trim()" class="font-semibold text-sm">{{ initials(m.display_name) }}</span>
                  <UserIcon v-else class="h-4 w-4 text-base-content/50" />
                </div>
                <div class="flex-1 min-w-0">
                  <div class="text-sm font-medium truncate">
                    {{ m.display_name }}
                    <span v-if="m.user_id === user?.id" class="text-xs text-base-content/50 font-normal">(du)</span>
                  </div>
                  <div class="text-xs text-base-content/50">
                    {{ m.role === 'owner' ? 'Inhaber:in' : 'Mitglied' }}
                  </div>
                </div>
                <!-- Kick button: only for owner viewing non-owner non-self rows -->
                <button
                  v-if="h.role === 'owner' && m.role !== 'owner' && m.user_id !== user?.id"
                  type="button"
                  class="btn btn-xs btn-ghost btn-circle text-error hover:bg-error hover:text-error-content"
                  title="Aus Haushalt entfernen"
                  aria-label="Aus Haushalt entfernen"
                  @click="requestKick(h.id, m.user_id)"
                >
                  <UserMinusIcon class="h-4 w-4" />
                </button>
              </li>
            </ul>
            <div v-else class="text-xs text-base-content/50 italic">
              Mitglieder werden geladen…
            </div>

            <!-- Kick confirmation inline -->
            <div
              v-if="confirmingKick && confirmingKick.hhId === h.id"
              class="mt-2 p-3 rounded-lg border border-error/40 bg-error/5 flex flex-col gap-2"
            >
              <div class="text-sm">
                <strong>{{ membersByHousehold[h.id]?.find(mm => mm.user_id === confirmingKick.userId)?.display_name }}</strong>
                wirklich aus dem Haushalt entfernen?
              </div>
              <div class="flex justify-end gap-2">
                <button type="button" class="btn btn-ghost btn-xs" :disabled="kicking" @click="cancelKick">
                  Abbrechen
                </button>
                <button type="button" class="btn btn-error btn-xs gap-1" :disabled="kicking" @click="confirmKick">
                  <span v-if="kicking" class="loading loading-spinner loading-xs" />
                  <UserMinusIcon v-else class="h-3.5 w-3.5" />
                  Entfernen
                </button>
              </div>
            </div>
          </div>

          <!-- Invite link (owners only) -->
          <div v-if="h.role === 'owner'" class="pt-3 border-t border-base-300/60">
            <div class="text-xs font-semibold uppercase tracking-wider text-base-content/60 mb-2 flex items-center gap-1">
              <LinkIcon class="h-3.5 w-3.5" />
              Einladungslink
            </div>

            <!-- No active link -->
            <template v-if="invitesByHousehold[h.id] === null">
              <p class="text-xs text-base-content/60 mb-2">
                Erstelle einen Link, den du an Mitbewohner:innen schicken kannst.
              </p>
              <button
                type="button"
                class="btn btn-primary btn-sm gap-1"
                :disabled="invitingId === h.id"
                @click="onCreateInvite(h.id)"
              >
                <span v-if="invitingId === h.id" class="loading loading-spinner loading-xs" />
                <PlusIcon v-else class="h-4 w-4" />
                Einladungslink erstellen
              </button>
            </template>

            <!-- Active link present -->
            <template v-else-if="invitesByHousehold[h.id]">
              <div class="flex items-center gap-2">
                <input
                  :value="inviteUrlFor(invitesByHousehold[h.id]!.token)"
                  readonly
                  class="input input-bordered input-sm flex-1 font-mono text-xs"
                  @focus="($event.target as HTMLInputElement).select()"
                />
                <button
                  type="button"
                  class="btn btn-sm btn-square btn-ghost"
                  :title="copiedToken === invitesByHousehold[h.id]!.token ? 'Kopiert!' : 'Kopieren'"
                  aria-label="Link kopieren"
                  @click="copyInviteUrl(invitesByHousehold[h.id]!.token)"
                >
                  <CheckIcon
                    v-if="copiedToken === invitesByHousehold[h.id]!.token"
                    class="h-4 w-4 text-success"
                  />
                  <ClipboardIcon v-else class="h-4 w-4" />
                </button>
              </div>
              <p class="text-xs text-base-content/50 mt-2">
                Jede:r mit diesem Link kann beitreten. Du kannst den Link
                jederzeit ersetzen oder widerrufen.
              </p>
              <div class="flex justify-end gap-2 mt-2">
                <button
                  type="button"
                  class="btn btn-ghost btn-xs gap-1"
                  :disabled="invitingId === h.id"
                  @click="onRevokeInvite(h.id)"
                >
                  <XMarkIcon class="h-3.5 w-3.5" />
                  Widerrufen
                </button>
                <button
                  type="button"
                  class="btn btn-outline btn-xs gap-1"
                  :disabled="invitingId === h.id"
                  @click="onRegenerateInvite(h.id)"
                >
                  <span v-if="invitingId === h.id" class="loading loading-spinner loading-xs" />
                  <ArrowPathIcon v-else class="h-3.5 w-3.5" />
                  Neu generieren
                </button>
              </div>
            </template>

            <div v-else class="text-xs text-base-content/50 italic">
              Wird geladen…
            </div>
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
