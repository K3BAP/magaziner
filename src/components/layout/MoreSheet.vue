<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import {
  ArchiveBoxIcon,
  BookOpenIcon,
  Cog6ToothIcon,
  ArrowRightStartOnRectangleIcon,
  HomeModernIcon,
  CheckIcon,
  MagnifyingGlassIcon,
  QrCodeIcon,
} from '@heroicons/vue/24/outline';
import BottomSheet from '../ui/BottomSheet.vue';
import { useInventory } from '../../composables/useInventory';
import { useHouseholds } from '../../composables/useHouseholds';
import { useActiveHousehold } from '../../composables/useActiveHousehold';
import { useAuth } from '../../composables/useAuth';
import { confirmDialog } from '../../composables/useConfirm';
import { toast } from '../../composables/useToast';

const open = defineModel<boolean>('open', { required: true });

const router = useRouter();
const { items } = useInventory();
const { households, switchHousehold } = useHouseholds();
const { activeHouseholdId } = useActiveHousehold();
const { user, signOut } = useAuth();

const go = (name: string) => {
  open.value = false;
  router.push({ name });
};

const tiles = computed(() => [
  { name: 'locations', label: 'Vorräte', icon: ArchiveBoxIcon, hint: items.value.length ? `${items.value.length} Produkte` : 'Orte & Produkte', tone: 'text-success bg-success/10' },
  { name: 'recipes', label: 'Rezepte', icon: BookOpenIcon, hint: 'Kochbuch', tone: 'text-accent bg-accent/10' },
  { name: 'allItems', label: 'Produktsuche', icon: MagnifyingGlassIcon, hint: 'Alle Vorräte', tone: 'text-info bg-info/10' },
  { name: 'scanner', label: 'Scannen', icon: QrCodeIcon, hint: 'Barcode erfassen', tone: 'text-secondary-content bg-secondary/30' },
]);

const onSwitch = async (id: string) => {
  if (id === activeHouseholdId.value) return;
  try {
    await switchHousehold(id);
    const name = households.value.find((h) => h.id === id)?.name;
    toast.success(`Gewechselt zu „${name}“`);
    open.value = false;
  } catch (e) {
    toast.error('Haushalt konnte nicht gewechselt werden.', e);
  }
};

const onSignOut = async () => {
  const ok = await confirmDialog({ title: 'Abmelden?', confirmLabel: 'Abmelden' });
  if (!ok) return;
  open.value = false;
  await signOut();
  router.push({ name: 'login' });
};
</script>

<template>
  <BottomSheet v-model:open="open" title="Mehr">
    <div class="grid grid-cols-2 gap-3">
      <button
        v-for="t in tiles"
        :key="t.name"
        type="button"
        class="surface pressable p-4 flex flex-col items-start gap-3 text-left"
        @click="go(t.name)"
      >
        <span class="h-10 w-10 rounded-2xl flex items-center justify-center" :class="t.tone">
          <component :is="t.icon" class="h-6 w-6" />
        </span>
        <span>
          <span class="block font-semibold">{{ t.label }}</span>
          <span class="block text-xs text-base-content/60">{{ t.hint }}</span>
        </span>
      </button>
    </div>

    <template v-if="households.length > 1">
      <h4 class="mt-6 mb-2 text-xs font-semibold uppercase tracking-wider text-base-content/50">Haushalt</h4>
      <div class="surface divide-y divide-base-200 overflow-hidden">
        <button
          v-for="h in households"
          :key="h.id"
          type="button"
          class="w-full flex items-center gap-3 px-4 py-3 text-left active:bg-base-200"
          @click="onSwitch(h.id)"
        >
          <HomeModernIcon class="h-5 w-5 text-base-content/60" />
          <span class="flex-1 truncate font-medium">{{ h.name }}</span>
          <CheckIcon v-if="h.id === activeHouseholdId" class="h-5 w-5 text-primary" />
        </button>
      </div>
    </template>

    <div class="mt-6 surface divide-y divide-base-200 overflow-hidden">
      <button type="button" class="w-full flex items-center gap-3 px-4 py-3 text-left active:bg-base-200" @click="go('settings')">
        <Cog6ToothIcon class="h-5 w-5 text-base-content/60" />
        <span class="flex-1 font-medium">Einstellungen</span>
      </button>
      <button type="button" class="w-full flex items-center gap-3 px-4 py-3 text-left text-error active:bg-base-200" @click="onSignOut">
        <ArrowRightStartOnRectangleIcon class="h-5 w-5" />
        <span class="flex-1 font-medium">Abmelden</span>
      </button>
    </div>
    <p class="text-center text-xs text-base-content/40 mt-4 mb-1">Angemeldet als {{ user?.email }}</p>
  </BottomSheet>
</template>
