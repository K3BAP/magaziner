<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuth } from '../composables/useAuth';
import { toast } from '../composables/useToast';
import { authErrorMessage } from '../utils/authErrors';
import AuthLayout from '../components/auth/AuthLayout.vue';

const { updatePassword } = useAuth();
const router = useRouter();

const password = ref('');
const passwordConfirm = ref('');
const loading = ref(false);
const errorMsg = ref('');

const handleSubmit = async () => {
  if (password.value.length < 8) {
    errorMsg.value = 'Das Passwort muss mindestens 8 Zeichen lang sein.';
    return;
  }
  if (password.value !== passwordConfirm.value) {
    errorMsg.value = 'Die Passwörter stimmen nicht überein.';
    return;
  }
  loading.value = true;
  errorMsg.value = '';
  try {
    await updatePassword(password.value);
    toast.success('Dein Passwort wurde geändert.');
    router.push({ name: 'dashboard' });
  } catch (e) {
    errorMsg.value = authErrorMessage(e);
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <AuthLayout title="Neues Passwort" subtitle="Mindestens 8 Zeichen.">
    <form class="flex flex-col gap-3" @submit.prevent="handleSubmit">
      <label class="flex flex-col gap-1.5">
        <span class="text-sm font-semibold">Neues Passwort</span>
        <input v-model="password" type="password" autocomplete="new-password" class="input w-full" required minlength="8" />
      </label>
      <label class="flex flex-col gap-1.5">
        <span class="text-sm font-semibold">Wiederholen</span>
        <input v-model="passwordConfirm" type="password" autocomplete="new-password" class="input w-full" required minlength="8" />
      </label>
      <p v-if="errorMsg" class="text-error text-sm" role="alert">{{ errorMsg }}</p>
      <button type="submit" class="btn btn-primary w-full" :disabled="loading">
        <span v-if="loading" class="loading loading-spinner loading-sm"></span>
        Passwort speichern
      </button>
    </form>
  </AuthLayout>
</template>
