<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useAuth } from '../composables/useAuth';
import { useProfile } from '../composables/useProfile';
import { useTheme } from '../composables/useTheme';
import AvatarUpload from '../components/settings/AvatarUpload.vue';
import HouseholdSwitcher from '../components/settings/HouseholdSwitcher.vue';
import {
  UserIcon,
  HomeIcon,
  PaintBrushIcon,
  KeyIcon,
  ArrowRightOnRectangleIcon,
  SunIcon,
  MoonIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  TrashIcon,
} from '@heroicons/vue/24/outline';

const router = useRouter();
const { user, signOut, updatePassword, deleteAccount } = useAuth();
const { profile, updateProfile } = useProfile();
const { theme, toggle: toggleTheme } = useTheme();

// --- Profile (display name) ---
const displayName = ref(profile.value?.display_name ?? '');
const savingProfile = ref(false);
const profileSaved = ref(false);

// Keep the local input in sync if the profile is reloaded (e.g. on first mount).
watch(() => profile.value?.display_name, (val) => {
  if (val !== undefined && !savingProfile.value) {
    displayName.value = val ?? '';
  }
});

const profileDirty = () =>
  (displayName.value ?? '').trim() !== (profile.value?.display_name ?? '');

const onSaveProfile = async () => {
  const name = displayName.value.trim();
  if (!name || !profileDirty()) return;
  savingProfile.value = true;
  try {
    await updateProfile({ display_name: name });
    profileSaved.value = true;
    setTimeout(() => { profileSaved.value = false; }, 1500);
  } finally {
    savingProfile.value = false;
  }
};

// --- Password change ---
const showPwd = ref(false);
const newPwd = ref('');
const confirmPwd = ref('');
const pwdError = ref<string | null>(null);
const pwdSaving = ref(false);
const pwdSaved = ref(false);

const onChangePassword = async () => {
  pwdError.value = null;
  if (newPwd.value.length < 8) {
    pwdError.value = 'Passwort muss mindestens 8 Zeichen lang sein.';
    return;
  }
  if (newPwd.value !== confirmPwd.value) {
    pwdError.value = 'Passwörter stimmen nicht überein.';
    return;
  }
  pwdSaving.value = true;
  try {
    await updatePassword(newPwd.value);
    pwdSaved.value = true;
    newPwd.value = '';
    confirmPwd.value = '';
    showPwd.value = false;
    setTimeout(() => { pwdSaved.value = false; }, 2000);
  } catch (e: any) {
    pwdError.value = e?.message ?? 'Konnte Passwort nicht ändern.';
  } finally {
    pwdSaving.value = false;
  }
};

// --- Logout ---
const onSignOut = async () => {
  await signOut();
  router.push({ name: 'login' });
};

// --- Konto löschen (mehrstufige Bestätigung) ---
//   'idle'    → nur der rote "Konto löschen" Knopf
//   'warn'    → Folgen-Aufzählung + "Abbrechen" / "Ja, weiter"
//   'confirm' → E-Mail eintippen, "Endgültig löschen"
const deleteStep = ref<'idle' | 'warn' | 'confirm'>('idle');
const deleteEmailInput = ref('');
const deleting = ref(false);
const deleteError = ref<string | null>(null);

const canConfirmDelete = computed(() => {
  const typed = deleteEmailInput.value.trim().toLowerCase();
  const actual = (user.value?.email ?? '').trim().toLowerCase();
  return typed.length > 0 && typed === actual;
});

const cancelDelete = () => {
  if (deleting.value) return;
  deleteStep.value = 'idle';
  deleteEmailInput.value = '';
  deleteError.value = null;
};

const goToConfirm = () => {
  deleteError.value = null;
  deleteEmailInput.value = '';
  deleteStep.value = 'confirm';
};

const onDeleteAccount = async () => {
  if (!canConfirmDelete.value || deleting.value) return;
  deleting.value = true;
  deleteError.value = null;
  try {
    await deleteAccount();
    router.replace({ name: 'login', query: { deleted: '1' } });
  } catch (e: any) {
    deleteError.value = e?.message ?? 'Konto konnte nicht gelöscht werden.';
  } finally {
    deleting.value = false;
  }
};
</script>

<template>
  <div class="flex flex-col gap-6 pb-10">
    <h1 class="text-2xl font-bold">Einstellungen</h1>

    <!-- Profil -->
    <section class="card bg-base-100 border border-base-300 shadow-sm">
      <div class="card-body p-5">
        <div class="flex items-center gap-2 mb-4">
          <UserIcon class="h-5 w-5 text-primary" />
          <h2 class="text-sm uppercase tracking-wider font-semibold text-base-content/60">Profil</h2>
        </div>

        <div class="flex flex-col items-center gap-4">
          <AvatarUpload />

          <div class="w-full">
            <label class="label py-1">
              <span class="label-text font-bold">Anzeigename</span>
            </label>
            <input
              v-model="displayName"
              type="text"
              class="input input-bordered w-full"
              :disabled="savingProfile"
              @keyup.enter="onSaveProfile"
            />
          </div>

          <button
            type="button"
            class="btn btn-primary self-end gap-1"
            :disabled="!profileDirty() || savingProfile"
            @click="onSaveProfile"
          >
            <span v-if="savingProfile" class="loading loading-spinner loading-xs" />
            <CheckIcon v-else-if="profileSaved" class="h-4 w-4" />
            {{ profileSaved ? 'Gespeichert' : 'Speichern' }}
          </button>
        </div>
      </div>
    </section>

    <!-- Haushalte -->
    <section class="card bg-base-100 border border-base-300 shadow-sm">
      <div class="card-body p-5">
        <div class="flex items-center gap-2 mb-4">
          <HomeIcon class="h-5 w-5 text-primary" />
          <h2 class="text-sm uppercase tracking-wider font-semibold text-base-content/60">Haushalte</h2>
        </div>
        <HouseholdSwitcher />
      </div>
    </section>

    <!-- Darstellung -->
    <section class="card bg-base-100 border border-base-300 shadow-sm">
      <div class="card-body p-5">
        <div class="flex items-center gap-2 mb-4">
          <PaintBrushIcon class="h-5 w-5 text-primary" />
          <h2 class="text-sm uppercase tracking-wider font-semibold text-base-content/60">Darstellung</h2>
        </div>

        <div class="flex items-center justify-between gap-4">
          <div>
            <div class="font-semibold">Design</div>
            <div class="text-xs text-base-content/60">
              {{ theme === 'dark' ? 'Dunkler Modus aktiv' : 'Heller Modus aktiv' }}
            </div>
          </div>
          <button
            type="button"
            class="btn btn-ghost btn-circle"
            @click="toggleTheme"
            :title="theme === 'dark' ? 'Helles Design' : 'Dunkles Design'"
          >
            <SunIcon v-if="theme === 'dark'" class="h-5 w-5" />
            <MoonIcon v-else class="h-5 w-5" />
          </button>
        </div>
      </div>
    </section>

    <!-- Konto -->
    <section class="card bg-base-100 border border-base-300 shadow-sm">
      <div class="card-body p-5">
        <div class="flex items-center gap-2 mb-4">
          <KeyIcon class="h-5 w-5 text-primary" />
          <h2 class="text-sm uppercase tracking-wider font-semibold text-base-content/60">Konto</h2>
        </div>

        <div class="flex flex-col gap-3">
          <div>
            <div class="text-xs text-base-content/60">E-Mail</div>
            <div class="font-mono text-sm">{{ user?.email ?? '—' }}</div>
          </div>

          <div v-if="!showPwd">
            <button type="button" class="btn btn-outline btn-sm" @click="showPwd = true">
              Passwort ändern
            </button>
          </div>

          <div v-else class="flex flex-col gap-2 p-3 rounded-xl border border-base-300 bg-base-100">
            <input
              v-model="newPwd"
              type="password"
              placeholder="Neues Passwort"
              class="input input-bordered input-sm w-full"
              :disabled="pwdSaving"
              autocomplete="new-password"
            />
            <input
              v-model="confirmPwd"
              type="password"
              placeholder="Passwort bestätigen"
              class="input input-bordered input-sm w-full"
              :disabled="pwdSaving"
              autocomplete="new-password"
            />
            <p v-if="pwdError" class="text-xs text-error">{{ pwdError }}</p>
            <div class="flex justify-end gap-2">
              <button
                type="button"
                class="btn btn-ghost btn-sm"
                :disabled="pwdSaving"
                @click="showPwd = false; newPwd = ''; confirmPwd = ''; pwdError = null"
              >
                Abbrechen
              </button>
              <button
                type="button"
                class="btn btn-primary btn-sm"
                :disabled="pwdSaving || !newPwd || !confirmPwd"
                @click="onChangePassword"
              >
                <span v-if="pwdSaving" class="loading loading-spinner loading-xs" />
                Speichern
              </button>
            </div>
          </div>

          <div v-if="pwdSaved" class="text-xs text-success">Passwort aktualisiert.</div>

          <!-- Gefahrenzone: Konto löschen -->
          <div class="mt-4 pt-4 border-t border-base-300 flex flex-col gap-2">
            <div class="flex items-center gap-2">
              <ExclamationTriangleIcon class="h-4 w-4 text-error" />
              <span class="text-xs uppercase tracking-wider font-semibold text-error">Gefahrenzone</span>
            </div>

            <button
              v-if="deleteStep === 'idle'"
              type="button"
              class="btn btn-outline btn-error btn-sm self-start gap-1"
              @click="deleteStep = 'warn'"
            >
              <TrashIcon class="h-4 w-4" />
              Konto löschen
            </button>

            <div
              v-else
              class="flex flex-col gap-3 p-3 rounded-xl border border-error/40 bg-error/5"
            >
              <div class="flex items-start gap-2">
                <ExclamationTriangleIcon class="h-5 w-5 text-error shrink-0 mt-0.5" />
                <div class="text-sm font-semibold">Konto wirklich löschen?</div>
              </div>

              <template v-if="deleteStep === 'warn'">
                <ul class="text-xs text-base-content/80 flex flex-col gap-1 pl-1">
                  <li class="flex items-start gap-2">
                    <span class="text-error mt-1">•</span>
                    <span>Dein Profil und deine Anmeldedaten werden gelöscht.</span>
                  </li>
                  <li class="flex items-start gap-2">
                    <span class="text-error mt-1">•</span>
                    <span>
                      Haushalte, die <strong>dir gehören</strong>, werden mit allen Daten
                      (Vorräte, Einkaufsliste, Rezepte, Finanzen, …) entfernt — auch für Mitbewohner:innen.
                    </span>
                  </li>
                  <li class="flex items-start gap-2">
                    <span class="text-error mt-1">•</span>
                    <span>
                      Du wirst aus Haushalten, in denen du nur Mitglied bist, entfernt.
                      Diese Haushalte bleiben bestehen.
                    </span>
                  </li>
                  <li class="flex items-start gap-2">
                    <span class="text-error mt-1">•</span>
                    <span><strong>Diese Aktion kann nicht rückgängig gemacht werden.</strong></span>
                  </li>
                </ul>
                <div class="flex justify-end gap-2">
                  <button
                    type="button"
                    class="btn btn-ghost btn-sm"
                    @click="cancelDelete"
                  >
                    Abbrechen
                  </button>
                  <button
                    type="button"
                    class="btn btn-error btn-sm"
                    @click="goToConfirm"
                  >
                    Ja, weiter
                  </button>
                </div>
              </template>

              <template v-else-if="deleteStep === 'confirm'">
                <p class="text-xs text-base-content/80">
                  Tippe zur Bestätigung deine E-Mail-Adresse
                  <span class="font-mono">{{ user?.email ?? '' }}</span> ein.
                </p>
                <input
                  v-model="deleteEmailInput"
                  type="email"
                  autocomplete="off"
                  class="input input-bordered input-sm w-full"
                  :disabled="deleting"
                  :placeholder="user?.email ?? 'E-Mail'"
                  @keyup.enter="onDeleteAccount"
                />
                <p v-if="deleteError" class="text-xs text-error">{{ deleteError }}</p>
                <div class="flex justify-end gap-2">
                  <button
                    type="button"
                    class="btn btn-ghost btn-sm"
                    :disabled="deleting"
                    @click="cancelDelete"
                  >
                    Abbrechen
                  </button>
                  <button
                    type="button"
                    class="btn btn-error btn-sm gap-1"
                    :disabled="!canConfirmDelete || deleting"
                    @click="onDeleteAccount"
                  >
                    <span v-if="deleting" class="loading loading-spinner loading-xs" />
                    <TrashIcon v-else class="h-4 w-4" />
                    Endgültig löschen
                  </button>
                </div>
              </template>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Abmelden -->
    <button
      type="button"
      class="btn btn-outline btn-error w-full gap-2"
      @click="onSignOut"
    >
      <ArrowRightOnRectangleIcon class="h-5 w-5" />
      Abmelden
    </button>
  </div>
</template>
