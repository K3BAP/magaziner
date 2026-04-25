<script setup lang="ts">
import { ref } from 'vue';
import { useAuth } from '../composables/useAuth';
import { RouterLink } from 'vue-router';

const { resetPassword } = useAuth();

const email = ref('');
const loading = ref(false);
const errorMsg = ref('');
const successMsg = ref('');

const handleSubmit = async () => {
  loading.value = true;
  errorMsg.value = '';
  successMsg.value = '';
  
  try {
    await resetPassword(email.value);
    successMsg.value = 'Falls ein Konto mit dieser E-Mail existiert, haben wir einen Link zum Zurücksetzen gesendet.';
    email.value = '';
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
          Passwort vergessen
        </h2>
        
        <p class="text-sm text-center mb-4 text-base-content/80">
          Gib Deine E-Mail-Adresse ein und wir senden Dir einen Link zum Zurücksetzen des Passworts.
        </p>

        <form @submit.prevent="handleSubmit" class="space-y-4">
          <input 
            v-model="email" 
            type="email" 
            placeholder="Email" 
            class="input input-bordered w-full" 
            required 
          />
          
          <div v-if="errorMsg" class="text-error text-sm text-center">
            {{ errorMsg }}
          </div>
          
          <div v-if="successMsg" class="text-success text-sm text-center">
            {{ successMsg }}
          </div>

          <button type="submit" class="btn btn-primary w-full" :disabled="loading">
            <span v-if="loading" class="loading loading-spinner"></span>
            Link senden
          </button>
        </form>

        <div class="text-center mt-4 text-sm">
          <RouterLink to="/login" class="link link-primary">
            Zurück zum Login
          </RouterLink>
        </div>
      </div>
    </div>
  </div>
</template>
