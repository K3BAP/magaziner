<script setup lang="ts">
import { useAuth } from '../../composables/useAuth';
import { useRouter } from 'vue-router';

const { user, signOut } = useAuth();
const router = useRouter();

// Close drawer programmatically by unchecking the checkbox
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
    <ul class="menu p-4 w-80 min-h-full bg-base-100 text-base-content flex flex-col">
      <li class="mb-4 font-bold text-xl px-4 py-2 bg-base-200 rounded-lg">Mein Vorrat</li>
      
      <li><a @click="navigate('dashboard')">📦 Orte / Dashboard</a></li>
      <li><a @click="navigate('allItems')">🔍 Alle Produkte</a></li>
      <li><a @click="navigate('todos')">✅ To-Do Liste</a></li>

      <div class="divider"></div>
      
      <li class="mt-auto"><a @click="handleSignOut" class="text-error">🚪 Abmelden</a></li>
      <li class="text-xs text-center mt-2 opacity-50">User: {{ user?.email }}</li>
    </ul>
  </div>
</template>