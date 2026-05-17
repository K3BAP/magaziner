<script setup lang="ts">
import { useAuth } from '../../composables/useAuth';
import { useProfile } from '../../composables/useProfile';
import { useActiveHousehold } from '../../composables/useActiveHousehold';
import { useRouter } from 'vue-router';
import { HomeIcon, Cog6ToothIcon } from '@heroicons/vue/24/outline';

const { user, signOut } = useAuth();
const { profile } = useProfile();
const { activeHousehold } = useActiveHousehold();
const router = useRouter();

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

      <!-- Active household header (tap to manage in Settings) -->
      <li
        class="mb-6 cursor-pointer"
        @click="navigate('settings')"
      >
        <div class="flex items-center gap-3 px-4 py-4 bg-base-200 rounded-xl shadow-sm hover:bg-base-300 transition-colors">
          <div class="w-10 h-10 rounded-full bg-base-100 flex items-center justify-center shrink-0">
            <HomeIcon class="h-5 w-5 text-primary" />
          </div>
          <div class="min-w-0 flex-1">
            <div class="font-bold text-lg truncate">{{ activeHousehold?.name ?? 'Mein Haushalt' }}</div>
            <div class="text-xs opacity-60">{{ profile?.display_name ?? user?.email }}</div>
          </div>
        </div>
      </li>

      <li>
        <a @click="navigate('dashboard')" class="py-4 text-lg font-medium">
          📊 Dashboard
        </a>
      </li>

      <li>
        <a @click="navigate('finance')" class="py-4 text-lg font-medium">
          💶 Finanzen
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

      <div class="divider my-4"></div>

      <li>
        <a @click="navigate('settings')" class="py-4 text-lg font-medium flex items-center gap-2">
          <Cog6ToothIcon class="h-5 w-5" />
          Einstellungen
        </a>
      </li>

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
