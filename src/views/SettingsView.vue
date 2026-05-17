<script setup lang="ts">
import { ref, watch } from 'vue';
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
} from '@heroicons/vue/24/outline';

const router = useRouter();
const { user, signOut, updatePassword } = useAuth();
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
