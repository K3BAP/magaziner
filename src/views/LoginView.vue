<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuth } from '../composables/useAuth';

const { signIn, signUp } = useAuth();
const router = useRouter();

const email = ref('');
const password = ref('');
const isLoginMode = ref(true);
const authLoading = ref(false);
const errorMsg = ref('');

const handleAuth = async () => {
  authLoading.value = true;
  errorMsg.value = '';
  try {
    if (isLoginMode.value) {
      await signIn(email.value, password.value);
      // Router redirect is usually handled by the guard or watchEffect in App.vue, 
      // but explicit push here is good UX.
      router.push({ name: 'dashboard' }); 
    } else {
      await signUp(email.value, password.value);
      alert('Registrierung erfolgreich! Du bist jetzt eingeloggt.');
      router.push({ name: 'dashboard' });
    }
  } catch (e: any) {
    errorMsg.value = e.message;
  } finally {
    authLoading.value = false;
  }
};
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-base-200 p-4">
    <div class="card w-full max-w-sm shadow-2xl bg-base-100">
      <div class="card-body">
        <h2 class="card-title justify-center mb-4">
          {{ isLoginMode ? 'Einloggen' : 'Registrieren' }}
        </h2>
        
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

          <button type="submit" class="btn btn-primary w-full" :disabled="authLoading">
            <span v-if="authLoading" class="loading loading-spinner"></span>
            {{ isLoginMode ? 'Starten' : 'Konto erstellen' }}
          </button>
        </form>

        <div class="text-center mt-4 text-sm cursor-pointer link link-primary" @click="isLoginMode = !isLoginMode">
          {{ isLoginMode ? 'Noch kein Konto?' : 'Zum Login' }}
        </div>
      </div>
    </div>
  </div>
</template>