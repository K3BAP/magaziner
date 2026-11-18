<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useFinance, type FinanceMember, type FinanceCategory } from '../composables/useFinance';
import { useActiveMembers } from '../composables/useHouseholdMembers';
import { confirmDialog } from '../composables/useConfirm';
import { toast } from '../composables/useToast';
import { normalize } from '../utils/text';
import FinanceOverview from '../components/finance/FinanceOverview.vue';
import FinanceExpenses from '../components/finance/FinanceExpenses.vue';
import ExpenseWizard from '../components/finance/ExpenseWizard.vue';
import PaymentWizard from '../components/finance/PaymentWizard.vue';
import BottomSheet from '../components/ui/BottomSheet.vue';
import AppFab from '../components/ui/AppFab.vue';
import UserAvatar from '../components/ui/UserAvatar.vue';
import { defineAsyncComponent } from 'vue';
import {
  PlusIcon,
  UserPlusIcon,
  TagIcon,
  ShoppingBagIcon,
  ArrowsRightLeftIcon,
  TrashIcon,
  CheckIcon,
} from '@heroicons/vue/24/outline';

// Chart.js only loads when the statistics tab is opened.
const FinanceStatistics = defineAsyncComponent(() => import('../components/finance/FinanceStatistics.vue'));

const {
  members,
  categories,
  transactions,
  fetchMembers,
  fetchTransactions,
  fetchCategories,
  addMember,
  updateMember,
  deleteMember,
  addCategory,
  updateCategory,
  deleteCategory,
  seedDefaultCategories,
  deleteTransaction,
  loading,
} = useFinance();
const { members: householdMembers, ensureLoaded } = useActiveMembers();

const TABS = ['Übersicht', 'Buchungen', 'Statistik'] as const;
const activeTab = ref(0);
const swipeDir = ref<'left' | 'right'>('left');
const setTab = (i: number) => {
  swipeDir.value = i > activeTab.value ? 'left' : 'right';
  activeTab.value = i;
};

onMounted(async () => {
  ensureLoaded();
  await Promise.all([
    members.value.length ? Promise.resolve() : fetchMembers(),
    transactions.value.length ? Promise.resolve() : fetchTransactions(),
    categories.value.length ? Promise.resolve() : fetchCategories(),
  ]);
});

// --- Swipe between tabs ---------------------------------------------------
let touchStart: { x: number; y: number } | null = null;
const onTouchStart = (e: TouchEvent) => {
  const t = e.touches[0];
  // Ignore swipes that start on horizontally scrollable bits (chips, charts).
  if ((e.target as HTMLElement).closest('.overflow-x-auto, canvas, input')) return;
  touchStart = { x: t.clientX, y: t.clientY };
};
const onTouchEnd = (e: TouchEvent) => {
  if (!touchStart) return;
  const t = e.changedTouches[0];
  const dx = t.clientX - touchStart.x;
  const dy = t.clientY - touchStart.y;
  touchStart = null;
  if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
  if (dx < 0 && activeTab.value < TABS.length - 1) setTab(activeTab.value + 1);
  if (dx > 0 && activeTab.value > 0) setTab(activeTab.value - 1);
};

// --- Create / edit transactions ---------------------------------------------
const showActions = ref(false);
const expenseWizard = ref<{ open: boolean; transaction: any | null }>({ open: false, transaction: null });
const paymentWizard = ref<{
  open: boolean;
  transaction: any | null;
  prefill: { amount: number; payerId: string; receiverId: string } | null;
}>({ open: false, transaction: null, prefill: null });

const newExpense = () => {
  showActions.value = false;
  if (members.value.length === 0) return openMember(null);
  expenseWizard.value = { open: true, transaction: null };
};
const newPayment = () => {
  showActions.value = false;
  if (members.value.length < 2) {
    toast.info('Für eine Zahlung braucht es mindestens zwei Personen.');
    return openMember(null);
  }
  paymentWizard.value = { open: true, transaction: null, prefill: null };
};
const editTransaction = (t: any) => {
  if (t.type === 'expense') expenseWizard.value = { open: true, transaction: t };
  else paymentWizard.value = { open: true, transaction: t, prefill: null };
};
const settle = (s: { amount: number; payerId: string; receiverId: string }) => {
  paymentWizard.value = { open: true, transaction: null, prefill: s };
};
const removeTransaction = async (t: any) => {
  const ok = await confirmDialog({
    title: t.type === 'expense' ? `„${t.title || 'Ausgabe'}“ löschen?` : 'Zahlung löschen?',
    message: 'Die Salden werden neu berechnet.',
    confirmLabel: 'Löschen',
    danger: true,
  });
  if (!ok) return;
  if (await deleteTransaction(t.id)) {
    expenseWizard.value.open = false;
    paymentWizard.value.open = false;
    toast.success('Buchung gelöscht');
  }
};

// --- People -------------------------------------------------------------------
const memberSheet = ref(false);
const editingMember = ref<FinanceMember | null>(null);
const memberName = ref('');

const openMember = (m: FinanceMember | null) => {
  showActions.value = false;
  editingMember.value = m;
  memberName.value = m?.name ?? '';
  memberSheet.value = true;
};

/** Household members that don't have a finance person with that name yet. */
const suggestedPeople = computed(() =>
  householdMembers.value
    .map((m) => m.display_name)
    .filter((n) => n && !members.value.some((fm) => normalize(fm.name) === normalize(n))),
);

const saveMember = async () => {
  const name = memberName.value.trim();
  if (!name) return;
  if (editingMember.value) await updateMember(editingMember.value.id, name);
  else await addMember(name);
  memberName.value = '';
  if (editingMember.value) memberSheet.value = false;
};

const addSuggested = async (name: string) => {
  await addMember(name);
};

const removeMember = async () => {
  if (!editingMember.value) return;
  const ok = await deleteMember(editingMember.value.id);
  if (ok) memberSheet.value = false;
};

// --- Categories -----------------------------------------------------------------
const categorySheet = ref(false);
const editingCategory = ref<FinanceCategory | null>(null);
const catName = ref('');
const catIcon = ref('📦');

const openCategories = () => {
  showActions.value = false;
  editingCategory.value = null;
  catName.value = '';
  catIcon.value = '📦';
  categorySheet.value = true;
};
const pickCategory = (c: FinanceCategory) => {
  editingCategory.value = c;
  catName.value = c.name;
  catIcon.value = c.icon || '📦';
};
const saveCategory = async () => {
  if (!catName.value.trim()) return;
  if (editingCategory.value) await updateCategory(editingCategory.value.id, catName.value.trim(), catIcon.value);
  else await addCategory(catName.value.trim(), catIcon.value);
  editingCategory.value = null;
  catName.value = '';
  catIcon.value = '📦';
};
const removeCategory = async () => {
  if (!editingCategory.value) return;
  const ok = await deleteCategory(editingCategory.value.id);
  if (ok) {
    editingCategory.value = null;
    catName.value = '';
  }
};

const needsOnboarding = computed(() => !loading.value && members.value.length === 0);
</script>

<template>
  <div @touchstart.passive="onTouchStart" @touchend.passive="onTouchEnd">
    <Teleport to="#header-actions" defer>
      <button type="button" class="btn btn-ghost btn-circle" aria-label="Kategorien verwalten" title="Kategorien" @click="openCategories">
        <TagIcon class="h-6 w-6" />
      </button>
      <button type="button" class="btn btn-ghost btn-circle" aria-label="Person hinzufügen" title="Personen" @click="openMember(null)">
        <UserPlusIcon class="h-6 w-6" />
      </button>
    </Teleport>

    <!-- Onboarding -->
    <div v-if="needsOnboarding" class="surface p-6 flex flex-col gap-4 text-center items-center">
      <div class="text-5xl">💶</div>
      <div>
        <h2 class="font-display text-2xl">Gemeinsam abrechnen</h2>
        <p class="text-sm text-base-content/65 mt-1">
          Trag ein, wer was bezahlt hat – Magaziner rechnet aus, wer wem wie viel schuldet.
        </p>
      </div>
      <div v-if="suggestedPeople.length" class="flex flex-col gap-2 w-full">
        <span class="text-sm font-semibold">Aus deinem Haushalt übernehmen</span>
        <div class="flex flex-wrap justify-center gap-2">
          <button
            v-for="n in suggestedPeople"
            :key="n"
            type="button"
            class="btn btn-sm rounded-full bg-base-200 border-0 gap-1.5 pl-1"
            @click="addSuggested(n)"
          >
            <UserAvatar :name="n" size="xs" /> {{ n }}
          </button>
        </div>
      </div>
      <button type="button" class="btn btn-primary gap-2" @click="openMember(null)">
        <UserPlusIcon class="h-5 w-5" /> Person anlegen
      </button>
    </div>

    <template v-else>
      <div role="tablist" class="tabs tabs-box bg-base-100 mb-4 grid grid-cols-3">
        <button
          v-for="(tab, i) in TABS"
          :key="tab"
          role="tab"
          type="button"
          class="tab"
          :class="{ 'tab-active': activeTab === i }"
          :aria-selected="activeTab === i"
          @click="setTab(i)"
        >
          {{ tab }}
        </button>
      </div>

      <Transition :name="`tab-${swipeDir}`" mode="out-in">
        <FinanceOverview v-if="activeTab === 0" key="o" @edit-member="openMember" @settle="settle" />
        <FinanceExpenses v-else-if="activeTab === 1" key="e" @edit-transaction="editTransaction" />
        <FinanceStatistics v-else key="s" @edit-transaction="editTransaction" />
      </Transition>

      <AppFab label="Buchen" extended @click="showActions = true">
        <PlusIcon class="h-6 w-6" />
      </AppFab>
    </template>

    <!-- What to book -->
    <BottomSheet v-model:open="showActions" title="Was möchtest du buchen?" size="sm">
      <div class="grid grid-cols-2 gap-3">
        <button type="button" class="surface pressable p-4 flex flex-col items-start gap-3 text-left" @click="newExpense">
          <span class="h-10 w-10 rounded-2xl bg-primary/12 text-primary flex items-center justify-center"><ShoppingBagIcon class="h-6 w-6" /></span>
          <span><span class="block font-semibold">Ausgabe</span><span class="block text-xs text-base-content/60">Jemand hat etwas bezahlt</span></span>
        </button>
        <button type="button" class="surface pressable p-4 flex flex-col items-start gap-3 text-left" @click="newPayment">
          <span class="h-10 w-10 rounded-2xl bg-success/12 text-success flex items-center justify-center"><ArrowsRightLeftIcon class="h-6 w-6" /></span>
          <span><span class="block font-semibold">Zahlung</span><span class="block text-xs text-base-content/60">Geld zurückgegeben</span></span>
        </button>
      </div>
    </BottomSheet>

    <ExpenseWizard
      :open="expenseWizard.open"
      :transaction="expenseWizard.transaction"
      @close="expenseWizard.open = false"
      @saved="expenseWizard.open = false; toast.success(expenseWizard.transaction ? 'Änderung gespeichert' : 'Ausgabe gebucht')"
      @delete="removeTransaction(expenseWizard.transaction)"
      @edit-categories="openCategories"
      @add-member="expenseWizard.open = false; openMember(null)"
    />
    <PaymentWizard
      :open="paymentWizard.open"
      :transaction="paymentWizard.transaction"
      :prefill="paymentWizard.prefill"
      @close="paymentWizard.open = false"
      @saved="paymentWizard.open = false; toast.success(paymentWizard.transaction ? 'Änderung gespeichert' : 'Zahlung gebucht')"
      @delete="removeTransaction(paymentWizard.transaction)"
      @add-member="paymentWizard.open = false; openMember(null)"
    />

    <!-- People -->
    <BottomSheet v-model:open="memberSheet" :title="editingMember ? 'Person bearbeiten' : 'Personen'">
      <div class="flex flex-col gap-4">
        <div v-if="!editingMember && members.length" class="flex flex-wrap gap-2">
          <button
            v-for="m in members"
            :key="m.id"
            type="button"
            class="btn btn-sm rounded-full bg-base-200 border-0 gap-1.5 pl-1"
            @click="openMember(m)"
          >
            <UserAvatar :name="m.name" size="xs" /> {{ m.name }}
          </button>
        </div>
        <div v-if="!editingMember && suggestedPeople.length" class="flex flex-col gap-2">
          <span class="text-sm font-semibold">Aus dem Haushalt</span>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="n in suggestedPeople"
              :key="n"
              type="button"
              class="btn btn-sm rounded-full btn-ghost border-dashed border-base-300 gap-1"
              @click="addSuggested(n)"
            >
              <PlusIcon class="h-4 w-4" /> {{ n }}
            </button>
          </div>
        </div>
        <form class="flex gap-2" @submit.prevent="saveMember">
          <input v-model="memberName" class="input flex-1" :placeholder="editingMember ? 'Name' : 'Weitere Person (z. B. Gast)'" autocomplete="off" />
          <button type="submit" class="btn btn-primary btn-square" :disabled="!memberName.trim()" :aria-label="editingMember ? 'Speichern' : 'Hinzufügen'">
            <CheckIcon v-if="editingMember" class="h-5 w-5" />
            <PlusIcon v-else class="h-5 w-5" />
          </button>
        </form>
      </div>
      <template v-if="editingMember" #footer>
        <button type="button" class="btn btn-ghost text-error mr-auto gap-1" @click="removeMember"><TrashIcon class="h-5 w-5" /> Löschen</button>
        <button type="button" class="btn btn-ghost" @click="openMember(null)">Zurück</button>
      </template>
    </BottomSheet>

    <!-- Categories -->
    <BottomSheet v-model:open="categorySheet" title="Kategorien" subtitle="Tippe eine Kategorie an, um sie zu bearbeiten.">
      <div class="flex flex-col gap-4">
        <div class="flex flex-wrap gap-2">
          <button
            v-for="c in categories"
            :key="c.id"
            type="button"
            class="btn btn-sm rounded-full border-0 gap-1"
            :class="editingCategory?.id === c.id ? 'btn-primary' : 'bg-base-200'"
            @click="pickCategory(c)"
          >
            <span>{{ c.icon }}</span>{{ c.name }}
          </button>
          <p v-if="categories.length === 0" class="text-sm text-base-content/60">Noch keine Kategorien.</p>
        </div>
        <form class="flex gap-2" @submit.prevent="saveCategory">
          <input v-model="catIcon" class="input w-14 text-center px-0 text-xl" maxlength="2" aria-label="Icon" />
          <input v-model="catName" class="input flex-1" :placeholder="editingCategory ? 'Name' : 'Neue Kategorie'" autocomplete="off" />
          <button type="submit" class="btn btn-primary btn-square" :disabled="!catName.trim()" aria-label="Speichern">
            <CheckIcon v-if="editingCategory" class="h-5 w-5" />
            <PlusIcon v-else class="h-5 w-5" />
          </button>
        </form>
        <button v-if="categories.length === 0" type="button" class="btn btn-sm btn-ghost self-start" @click="seedDefaultCategories">
          ✨ Standard-Kategorien anlegen
        </button>
      </div>
      <template v-if="editingCategory" #footer>
        <button type="button" class="btn btn-ghost text-error mr-auto gap-1" @click="removeCategory"><TrashIcon class="h-5 w-5" /> Löschen</button>
        <button type="button" class="btn btn-ghost" @click="editingCategory = null; catName = ''; catIcon = '📦'">Abbrechen</button>
      </template>
    </BottomSheet>
  </div>
</template>

<style scoped>
.tab-left-enter-active,
.tab-left-leave-active,
.tab-right-enter-active,
.tab-right-leave-active {
  transition: transform 0.18s ease, opacity 0.18s ease;
}
.tab-left-enter-from,
.tab-right-leave-to {
  transform: translateX(24px);
  opacity: 0;
}
.tab-left-leave-to,
.tab-right-enter-from {
  transform: translateX(-24px);
  opacity: 0;
}
</style>
