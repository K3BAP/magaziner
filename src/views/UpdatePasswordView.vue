<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuth } from '../composables/useAuth';

const { updatePassword } = useAuth();
const router = useRouter();

const password = ref('');
const passwordConfirm = ref('');
const loading = ref(false);
const errorMsg = ref('');

const handleSubmit = async () => {
  if (password.value !== passwordConfirm.value) {
    errorMsg.value = 'Passwörter stimmen nicht überein.';
    return;
  }

  loading.value = true;
  errorMsg.value = '';
  
  try {
    await updatePassword(password.value);
    alert('Dein Passwort wurde erfolgreich aktualisiert.');
    router.push({ name: 'dashboard' });
  } catch (e: any) {
    errorMsg.value = e.message;
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-base-200 p-4">
    <div class="card w-full max-w-sm shadow-2xl bg-base-100">
      <div class="card-body">
        <h2 class="card-title justify-center mb-4">
          Neues Passwort setzen
        </h2>

        <form @submit.prevent="handleSubmit" class="space-y-4">
          <input 
            v-model="password" 
            type="password" 
            placeholder="Neues Passwort" 
            class="input input-bordered w-full" 
            required 
            minlength="6"
          />
          
          <input 
            v-model="passwordConfirm" 
            type="password" 
            placeholder="Passwort bestätigen" 
            class="input input-bordered w-full" 
            required 
            minlength="6"
          />
          
          <div v-if="errorMsg" class="text-error text-sm text-center">
            {{ errorMsg }}
          </div>

          <button type="submit" class="btn btn-primary w-full" :disabled="loading">
            <span v-if="loading" class="loading loading-spinner"></span>
            Passwort aktualisieren
          </button>
        </form>
      </div>
    </div>
  </div>
</template>
