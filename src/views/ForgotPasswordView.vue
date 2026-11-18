<script setup lang="ts">
import { ref } from 'vue';
import { RouterLink } from 'vue-router';
import { useAuth } from '../composables/useAuth';
import { authErrorMessage } from '../utils/authErrors';
import AuthLayout from '../components/auth/AuthLayout.vue';

const { resetPassword } = useAuth();

const email = ref('');
const loading = ref(false);
const errorMsg = ref('');
const sent = ref(false);

const handleSubmit = async () => {
  loading.value = true;
  errorMsg.value = '';
  try {
    await resetPassword(email.value);
    sent.value = true;
  } catch (e) {
    errorMsg.value = authErrorMessage(e);
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <AuthLayout title="Passwort vergessen" subtitle="Wir schicken dir einen Link, mit dem du ein neues Passwort setzt.">
    <div v-if="sent" class="text-center flex flex-col gap-2 py-2">
      <div class="text-4xl">📬</div>
      <p class="font-semibold">Schau in dein Postfach</p>
      <p class="text-sm text-base-content/65">
        Falls es ein Konto mit dieser E-Mail gibt, ist der Link unterwegs. Prüfe auch den Spam-Ordner.
      </p>
    </div>
    <form v-else class="flex flex-col gap-3" @submit.prevent="handleSubmit">
      <label class="flex flex-col gap-1.5">
        <span class="text-sm font-semibold">E-Mail</span>
        <input v-model="email" type="email" autocomplete="email" inputmode="email" class="input w-full" required />
      </label>
      <p v-if="errorMsg" class="text-error text-sm" role="alert">{{ errorMsg }}</p>
      <button type="submit" class="btn btn-primary w-full" :disabled="loading">
        <span v-if="loading" class="loading loading-spinner loading-sm"></span>
        Link senden
      </button>
    </form>
    <template #after>
      <RouterLink to="/login" class="text-center text-sm link link-primary font-semibold">Zurück zur Anmeldung</RouterLink>
    </template>
  </AuthLayout>
</template>
