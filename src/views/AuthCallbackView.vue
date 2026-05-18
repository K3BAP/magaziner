<script setup lang="ts">
import { ref, watch } from 'vue';
import { useRoute, useRouter, RouterLink } from 'vue-router';
import { useAuth } from '../composables/useAuth';

const route = useRoute();
const router = useRouter();
const { user, isAuthReady } = useAuth();

// OAuth providers send error info via query string when consent is denied or
// something else goes wrong. Surface it instead of silently spinning forever.
const oauthError =
  (typeof route.query.error_description === 'string' && route.query.error_description) ||
  (typeof route.query.error === 'string' && route.query.error) ||
  null;

const errorMsg = ref<string | null>(oauthError);

const readRedirect = (): string => {
  let target: string | null = null;
  try {
    target = localStorage.getItem('magaziner:postLoginRedirect');
    localStorage.removeItem('magaziner:postLoginRedirect');
  } catch {
    /* ignore */
  }
  return target && target.startsWith('/') ? target : '/';
};

// Wait for useAuth to settle. Supabase's detectSessionInUrl extracts the
// session before this view even mounts, but onAuthStateChange flips
// `isAuthReady` back to false while it loads the freshly-created profile.
// We only want to forward once both are stable AND a user exists.
if (!oauthError) {
  watch(
    [isAuthReady, user],
    ([ready, u]) => {
      if (!ready) return;
      if (u) {
        router.replace(readRedirect());
      } else {
        // Session never materialised — likely a stale link or a config issue.
        errorMsg.value = 'Anmeldung fehlgeschlagen. Bitte erneut versuchen.';
      }
    },
    { immediate: true }
  );
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-base-200 p-4">
    <div class="card w-full max-w-sm shadow-2xl bg-base-100">
      <div class="card-body items-center text-center">
        <template v-if="!errorMsg">
          <span class="loading loading-spinner loading-lg text-primary" />
          <h2 class="card-title mt-2">Wird angemeldet…</h2>
          <p class="text-sm text-base-content/60">Einen Moment bitte.</p>
        </template>
        <template v-else>
          <h2 class="card-title text-error">Anmeldung fehlgeschlagen</h2>
          <p class="text-sm text-base-content/70">{{ errorMsg }}</p>
          <RouterLink to="/login" class="btn btn-primary btn-sm mt-3">
            Zurück zum Login
          </RouterLink>
        </template>
      </div>
    </div>
  </div>
</template>
