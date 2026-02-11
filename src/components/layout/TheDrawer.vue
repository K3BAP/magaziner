<script setup lang="ts">
import { useAuth } from '../../composables/useAuth';
import { useRouter } from 'vue-router';

const { user, signOut } = useAuth();
const router = useRouter();

// Drawer schließen durch Deaktivieren der Checkbox
const closeDrawer = () => {
  const checkbox = document.getElementById('main-drawer') as HTMLInputElement;
  if (checkbox) checkbox.checked = false;
};

const navigate = (name: string) => {
  router.push({ name });
  closeDrawer();
};

const handleSignOut = async () => {
  await signOut();
  closeDrawer();
  router.push({ name: 'login' });
};
</script>

<template>
  <div class="drawer-side z-20">
    <label for="main-drawer" class="drawer-overlay"></label>
    
    <ul class="menu p-4 w-80 min-h-full bg-base-100 text-base-content flex flex-col gap-2">
      
      <li class="mb-6 font-bold text-2xl px-4 py-4 bg-base-200 rounded-xl text-center shadow-sm">
        Mein Haushalt
      </li>
      
      <li>
        <a @click="navigate('dashboard')" class="py-4 text-lg font-medium">
          📊 Dashboard
        </a>
      </li>

      <li>
        <a @click="navigate('locations')" class="py-4 text-lg font-medium">
          📦 Vorräte
        </a>
      </li>

      <li>
        <a @click="navigate('todos')" class="py-4 text-lg font-medium">
          ✅ Aufgaben
        </a>
      </li>

      <li>
        <a @click="navigate('shoppingList')" class="py-4 text-lg font-medium">
          🛒 Einkaufsliste
        </a>
      </li>

      <li>
        <a @click="navigate('recipes')" class="py-4 text-lg font-medium">
          📖 Rezepte
        </a>
      </li>

      <li>
        <a @click="navigate('finance')" class="py-4 text-lg font-medium">
          💶 Finanzen
        </a>
      </li>

      <div class="divider my-4"></div>
      
      <li class="mt-auto">
        <a @click="handleSignOut" class="text-error py-4 text-lg font-medium">
          🚪 Abmelden
        </a>
      </li>
      
      <li class="text-xs text-center mt-2 opacity-50 pb-4">
        Angemeldet als: {{ user?.email }}
      </li>
    </ul>
  </div>
</template>