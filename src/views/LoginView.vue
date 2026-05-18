<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter, useRoute, RouterLink } from 'vue-router';
import { useAuth } from '../composables/useAuth';

const { signIn, signUp, signInWithGoogle } = useAuth();
const router = useRouter();
const route = useRoute();

const email = ref('');
const password = ref('');
const isLoginMode = ref(true);
const authLoading = ref(false);
const googleLoading = ref(false);
const errorMsg = ref('');

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
      alert('Registrierung erfolgreich! Du bist jetzt eingeloggt.');
    }
    router.push(redirectTarget());
  } catch (e: any) {
    errorMsg.value = e.message;
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
    errorMsg.value = e.message ?? 'Google-Anmeldung fehlgeschlagen.';
    googleLoading.value = false;
  }
};
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-base-200 p-4">
    <div class="w-full max-w-sm flex flex-col gap-3">
      <div
        v-if="deletedNotice"
        class="alert alert-success text-sm"
        role="status"
      >
        Dein Konto wurde gelöscht.
      </div>

      <div class="card shadow-2xl bg-base-100">
        <div class="card-body">
          <h2 class="card-title justify-center mb-4">
            {{ isLoginMode ? 'Einloggen' : 'Registrieren' }}
          </h2>

          <button
            type="button"
            class="btn btn-outline w-full gap-2"
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

          <div class="divider text-xs text-base-content/50 my-2">oder</div>

          <form @submit.prevent="handleAuth" class="space-y-4">
            <input
              v-model="email"
              type="email"
              placeholder="Email"
              class="input input-bordered w-full"
              required
            />
            <input
              v-model="password"
              type="password"
              placeholder="Passwort"
              class="input input-bordered w-full"
              required
            />

            <div v-if="errorMsg" class="text-error text-sm text-center">
              {{ errorMsg }}
            </div>

            <button type="submit" class="btn btn-primary w-full" :disabled="authLoading || googleLoading">
              <span v-if="authLoading" class="loading loading-spinner"></span>
              {{ isLoginMode ? 'Starten' : 'Konto erstellen' }}
            </button>
          </form>

          <div class="text-center mt-4 text-sm cursor-pointer link link-primary" @click="isLoginMode = !isLoginMode">
            {{ isLoginMode ? 'Noch kein Konto?' : 'Zum Login' }}
          </div>

          <div v-if="isLoginMode" class="text-center mt-2 text-sm">
            <RouterLink to="/forgot-password" class="link link-hover text-base-content/70">
              Passwort vergessen?
            </RouterLink>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
