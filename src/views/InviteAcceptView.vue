<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuth } from '../composables/useAuth';
import { useProfile } from '../composables/useProfile';
import { useHouseholds } from '../composables/useHouseholds';
import { useInvites } from '../composables/useInvites';
import { CheckCircleIcon, ExclamationTriangleIcon, HomeIcon, ArrowRightIcon } from '@heroicons/vue/24/outline';

const route = useRoute();
const router = useRouter();
const { user } = useAuth();
const { fetchProfile } = useProfile();
const { households, fetchMyHouseholds } = useHouseholds();
const { acceptInvite } = useInvites();

type Phase = 'pending' | 'accepting' | 'joined' | 'unauthenticated' | 'error';
const phase = ref<Phase>('pending');
const errorMsg = ref<string | null>(null);
const joinedHouseholdId = ref<string | null>(null);

const token = (): string => {
  const t = route.params.token;
  return Array.isArray(t) ? t[0] : t;
};

const joinedHouseholdName = () => {
  if (!joinedHouseholdId.value) return '';
  return households.value.find(h => h.id === joinedHouseholdId.value)?.name ?? 'Haushalt';
};

const goToLogin = () => {
  router.push({
    name: 'login',
    // Come back to this exact URL once authed.
    query: { redirect: route.fullPath },
  });
};

const goToDashboard = () => {
  router.push({ name: 'dashboard' });
};

const accept = async () => {
  phase.value = 'accepting';
  errorMsg.value = null;
  try {
    const hhId = await acceptInvite(token());
    joinedHouseholdId.value = hhId;

    // Refresh local caches: the profile now points at the new active
    // household, and the household list needs to include the new entry.
    if (user.value) await fetchProfile(user.value.id);
    await fetchMyHouseholds();

    phase.value = 'joined';
  } catch (e: any) {
    errorMsg.value = e?.message ?? 'Einladung konnte nicht eingelöst werden.';
    phase.value = 'error';
  }
};

onMounted(() => {
  if (!user.value) {
    phase.value = 'unauthenticated';
    return;
  }
  accept();
});
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-base-200 p-4">
    <div class="card w-full max-w-md shadow-2xl bg-base-100">
      <div class="card-body items-center text-center gap-4">
        <!-- Unauthenticated: prompt to log in first -->
        <template v-if="phase === 'unauthenticated'">
          <div class="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
            <HomeIcon class="h-7 w-7 text-primary" />
          </div>
          <h2 class="text-xl font-bold">Haushalt beitreten</h2>
          <p class="text-sm text-base-content/70">
            Du wurdest eingeladen, einem Haushalt beizutreten.
            Melde dich an oder erstelle ein Konto, um fortzufahren.
          </p>
          <button class="btn btn-primary w-full gap-1" @click="goToLogin">
            Weiter zum Login
            <ArrowRightIcon class="h-4 w-4" />
          </button>
        </template>

        <!-- Accepting (or initial fetch): spinner -->
        <template v-else-if="phase === 'pending' || phase === 'accepting'">
          <span class="loading loading-spinner loading-lg text-primary" />
          <p class="text-sm text-base-content/70">Einladung wird eingelöst…</p>
        </template>

        <!-- Joined: success -->
        <template v-else-if="phase === 'joined'">
          <div class="w-14 h-14 rounded-full bg-success/10 flex items-center justify-center">
            <CheckCircleIcon class="h-7 w-7 text-success" />
          </div>
          <h2 class="text-xl font-bold">Beigetreten!</h2>
          <p class="text-sm text-base-content/70">
            Du bist jetzt Mitglied von
            <strong>„{{ joinedHouseholdName() }}"</strong>.
            Der Haushalt ist als aktiv ausgewählt.
          </p>
          <button class="btn btn-primary w-full gap-1" @click="goToDashboard">
            Zum Dashboard
            <ArrowRightIcon class="h-4 w-4" />
          </button>
        </template>

        <!-- Error -->
        <template v-else>
          <div class="w-14 h-14 rounded-full bg-error/10 flex items-center justify-center">
            <ExclamationTriangleIcon class="h-7 w-7 text-error" />
          </div>
          <h2 class="text-xl font-bold">Einladung ungültig</h2>
          <p class="text-sm text-error">{{ errorMsg }}</p>
          <button class="btn btn-outline w-full" @click="goToDashboard">
            Zum Dashboard
          </button>
        </template>
      </div>
    </div>
  </div>
</template>
