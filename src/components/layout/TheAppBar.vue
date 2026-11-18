<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ChevronLeftIcon } from '@heroicons/vue/24/outline';
import { useProfile } from '../../composables/useProfile';
import { usePageTitle } from '../../composables/usePageTitle';
import UserAvatar from '../ui/UserAvatar.vue';

const route = useRoute();
const router = useRouter();
const { profile } = useProfile();
const { pageTitleOverride } = usePageTitle();

const title = computed(() => pageTitleOverride.value ?? route.meta.title ?? 'Magaziner');
const hasBack = computed(() => !!route.meta.back);

const goBack = () => {
  // Prefer real history (keeps scroll position and filters), fall back to the parent.
  const prev = (window.history.state as { back?: string | null } | null)?.back;
  if (prev) router.back();
  else router.push({ name: route.meta.back! });
};
</script>

<template>
  <header class="appbar sticky top-0 z-30 bg-base-200/85 backdrop-blur-xl">
    <div class="mx-auto max-w-2xl h-14 px-2 flex items-center gap-1">
      <button
        v-if="hasBack"
        type="button"
        class="btn btn-ghost btn-circle"
        aria-label="Zurück"
        @click="goBack"
      >
        <ChevronLeftIcon class="h-6 w-6" />
      </button>
      <div v-else class="w-2" />

      <h1 class="flex-1 min-w-0 font-display text-xl truncate">{{ title }}</h1>

      <!-- Views teleport page-specific actions in here. -->
      <div id="header-actions" class="flex items-center gap-0.5" />

      <RouterLink
        :to="{ name: 'settings' }"
        class="btn btn-ghost btn-circle"
        aria-label="Einstellungen und Profil"
      >
        <UserAvatar :name="profile?.display_name" :src="profile?.avatar_url" size="sm" />
      </RouterLink>
    </div>
  </header>
</template>

<style scoped>
.appbar {
  padding-top: env(safe-area-inset-top);
}
</style>
