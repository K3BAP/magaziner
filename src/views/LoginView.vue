<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter, useRoute, RouterLink } from 'vue-router';
import { useAuth } from '../composables/useAuth';
import { toast } from '../composables/useToast';
import { authErrorMessage } from '../utils/authErrors';
import AuthLayout from '../components/auth/AuthLayout.vue';
import { EyeIcon, EyeSlashIcon } from '@heroicons/vue/24/outline';

const { signIn, signUp, signInWithGoogle } = useAuth();
const router = useRouter();
const route = useRoute();

const email = ref('');
const password = ref('');
const isLoginMode = ref(true);
const authLoading = ref(false);
const googleLoading = ref(false);
const errorMsg = ref('');
const showPassword = ref(false);

// Shown once after a successful self-service account deletion (the delete
// flow does `router.replace({ name: 'login', query: { deleted: '1' } })`).
const deletedNotice = computed(() => route.query.deleted === '1');

// After a successful auth, return to wherever the user was headed (e.g. an
// invite link they followed before logging in). Falls back to dashboard.
const redirectTarget = (): string => {
  const r = route.query.redirect;
  if (typeof r === 'string' && r.startsWith('/')) return r;
  return '/';
};

const handleAuth = async () => {
  authLoading.value = true;
  errorMsg.value = '';
  try {
    if (isLoginMode.value) {
      await signIn(email.value, password.value);
    } else {
      await signUp(email.value, password.value);
      toast.success('Willkommen! Dein Konto ist eingerichtet.');
    }
    router.push(redirectTarget());
  } catch (e: any) {
    errorMsg.value = authErrorMessage(e);
  } finally {
    authLoading.value = false;
  }
};

const onGoogle = async () => {
  googleLoading.value = true;
  errorMsg.value = '';
  try {
    // signInWithOAuth navigates the window away to Google. The promise
    // resolves immediately after the redirect kicks off; spinner stays
    // visible until the browser leaves the page.
    await signInWithGoogle(redirectTarget());
  } catch (e: any) {
    errorMsg.value = authErrorMessage(e) || 'Google-Anmeldung fehlgeschlagen.';
    googleLoading.value = false;
  }
};
</script>

<template>
  <AuthLayout
    :title="isLoginMode ? 'Willkommen zurück' : 'Konto erstellen'"
    :subtitle="isLoginMode ? 'Vorräte, Einkauf, Aufgaben und Finanzen deines Haushalts.' : 'In einer Minute startklar – gemeinsam mit deinem Haushalt.'"
  >
    <template #before>
      <div v-if="deletedNotice" class="rounded-2xl bg-success/12 text-success text-sm px-4 py-3 text-center" role="status">
        Dein Konto wurde gelöscht.
      </div>
    </template>

    <button
      type="button"
      class="btn w-full gap-2 bg-base-100 border-base-300"
      :disabled="authLoading || googleLoading"
      @click="onGoogle"
    >
      <span v-if="googleLoading" class="loading loading-spinner loading-xs" />
      <svg v-else aria-hidden="true" class="h-5 w-5" viewBox="0 0 48 48">
        <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
        <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
        <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
        <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571.001-.001.002-.001.003-.002l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
      </svg>
      Mit Google fortfahren
    </button>

    <div class="divider text-xs text-base-content/50 my-0">oder mit E-Mail</div>

    <form class="flex flex-col gap-3" @submit.prevent="handleAuth">
      <label class="flex flex-col gap-1.5">
        <span class="text-sm font-semibold">E-Mail</span>
        <input v-model="email" type="email" autocomplete="email" inputmode="email" class="input w-full" required />
      </label>
      <label class="flex flex-col gap-1.5">
        <span class="text-sm font-semibold">Passwort</span>
        <span class="input w-full pr-1">
          <input
            v-model="password"
            :type="showPassword ? 'text' : 'password'"
            :autocomplete="isLoginMode ? 'current-password' : 'new-password'"
            :minlength="isLoginMode ? undefined : 8"
            required
          />
          <button type="button" class="btn btn-ghost btn-sm btn-circle" :aria-label="showPassword ? 'Passwort verbergen' : 'Passwort anzeigen'" @click="showPassword = !showPassword">
            <component :is="showPassword ? EyeSlashIcon : EyeIcon" class="h-5 w-5" />
          </button>
        </span>
      </label>

      <p v-if="errorMsg" class="text-error text-sm" role="alert">{{ errorMsg }}</p>

      <button type="submit" class="btn btn-primary w-full mt-1" :disabled="authLoading || googleLoading">
        <span v-if="authLoading" class="loading loading-spinner loading-sm"></span>
        {{ isLoginMode ? 'Anmelden' : 'Konto erstellen' }}
      </button>
    </form>

    <RouterLink v-if="isLoginMode" to="/forgot-password" class="text-sm text-center link link-hover text-base-content/70">
      Passwort vergessen?
    </RouterLink>

    <template #after>
      <p class="text-center text-sm text-base-content/70">
        {{ isLoginMode ? 'Neu hier?' : 'Schon ein Konto?' }}
        <button type="button" class="link link-primary font-semibold" @click="isLoginMode = !isLoginMode; errorMsg = ''">
          {{ isLoginMode ? 'Konto erstellen' : 'Anmelden' }}
        </button>
      </p>
    </template>
  </AuthLayout>
</template>
