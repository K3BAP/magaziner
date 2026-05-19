<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { useFinance, type FinanceMember, type FinanceCategory } from '../composables/useFinance';
import { useExpenseSplits } from '../composables/useExpenseSplits';
import FinanceOverview from '../components/finance/FinanceOverview.vue';
import FinanceExpenses from '../components/finance/FinanceExpenses.vue';
import FinanceStatistics from '../components/finance/FinanceStatistics.vue';
import ExpenseWizard from '../components/finance/ExpenseWizard.vue';
import PaymentWizard from '../components/finance/PaymentWizard.vue';

// Tabs
const activeTab = ref(0);
const tabs = ['Übersicht', 'Ausgaben', 'Statistik'];

// Data
const { 
  members, 
  categories, 
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
  addTransaction,
  updateTransaction,
  deleteTransaction
} = useFinance();

onMounted(async () => {
  await Promise.all([fetchMembers(), fetchTransactions(), fetchCategories()]);
  checkOnboarding();
});

const checkOnboarding = () => {
  if (members.value.length === 0) {
    showMemberModal.value = true;
  }
};

// Scroll & Tab Logic
const scrollContainer = ref<HTMLElement | null>(null);

const handleScroll = (e: Event) => {
  const target = e.target as HTMLElement;
  const scrollLeft = target.scrollLeft;
  const width = target.clientWidth;
  if (width === 0) return;
  const newTab = Math.round(scrollLeft / width);
  if (activeTab.value !== newTab) {
    activeTab.value = newTab;
  }
};

const scrollToTab = (index: number) => {
  activeTab.value = index;
  if (scrollContainer.value) {
    const width = scrollContainer.value.clientWidth;
    scrollContainer.value.scrollTo({
      left: index * width,
      behavior: 'smooth'
    });
  }
};


// --- FAB & Menu ---
const isFabOpen = ref(false);

const toggleFab = () => {
  isFabOpen.value = !isFabOpen.value;
};

// --- Modals ---
const showMemberModal = ref(false);
const showCategoryModal = ref(false); // New Modal
const showExpenseModal = ref(false); // edit-only after the wizard refactor
const showPaymentModal = ref(false); // edit-only after the wizard refactor

// --- Wizards (create flow) ---
// Edit goes through the existing modals via `handleEditTransaction`; create
// hops through a step-by-step wizard instead so quick mobile entry feels fast.
const showExpenseWizard = ref(false);
const showPaymentWizard = ref(false);

const newMemberName = ref('');
const newCategoryName = ref(''); // Category Input
const newCategoryIcon = ref('📦');

// Expense Form
const expenseTitle = ref('');
const expenseAmount = ref<number | null>(null);
const expensePayer = ref<string>('');
const expenseCategory = ref<string>('');
const expenseDate = ref(new Date().toISOString().split('T')[0]);

// Split state + math lives in a composable shared with ExpenseWizard. The
// composable expects a numeric Ref, so we coerce the form's `number | null`
// here. `handleSplitChange` / `handleActiveChange` are exported under their
// legacy names so the existing template bindings keep working.
const expenseAmountForSplits = computed(() => Number(expenseAmount.value) || 0);
const {
  splits: expenseSplits,
  initEqual: initSplits,
  hydrateFrom: hydrateExpenseSplitsFromDb,
  onFieldEdit: handleSplitChange,
  onActiveToggle: handleActiveChange,
  finaliseForSave: finaliseExpenseSplits,
} = useExpenseSplits(members, expenseAmountForSplits);

watch(showExpenseModal, (val) => {
  if (val && expenseSplits.value.length === 0) initSplits();
});

// Payment Form
const paymentAmount = ref<number | null>(null);
const paymentPayer = ref<string>('');
const paymentReceiver = ref<string>('');
const paymentDate = ref(new Date().toISOString().split('T')[0]);

// --- Edit State ---
const editingMember = ref<FinanceMember | null>(null);
const editingCategory = ref<FinanceCategory | null>(null);
const editingTransaction = ref<any | null>(null); 

const handleEditMember = (member: FinanceMember) => {
  editingMember.value = member;
  newMemberName.value = member.name;
  showMemberModal.value = true;
};

const handleEditCategory = (category: FinanceCategory) => {
  editingCategory.value = category;
  newCategoryName.value = category.name;
  newCategoryIcon.value = category.icon || '📦';
  // showCategoryModal is already true if we are here usually, but just in case
};

const handleEditTransaction = (trans: any) => {
  editingTransaction.value = trans;
  
  if (trans.type === 'expense') {
     expenseTitle.value = trans.title || '';
     expenseAmount.value = trans.amount;
     expenseDate.value = trans.date;
     expensePayer.value = trans.payer_id;
     expenseCategory.value = trans.category_id || '';

     hydrateExpenseSplitsFromDb(trans.splits);
     showExpenseModal.value = true;
  } else {
     paymentAmount.value = trans.amount;
     paymentDate.value = trans.date;
     paymentPayer.value = trans.payer_id;
     paymentReceiver.value = trans.receiver_id;
     showPaymentModal.value = true;
  }
};

const resetModals = () => {
  editingMember.value = null;
  editingCategory.value = null;
  editingTransaction.value = null;
  newMemberName.value = '';
  newCategoryName.value = ''; // Reset category inputs
  newCategoryIcon.value = '📦';
  expenseTitle.value = '';
  expenseAmount.value = null;
  expenseCategory.value = '';
  paymentAmount.value = null;
};

watch([showMemberModal, showCategoryModal, showExpenseModal, showPaymentModal], ([m, c, e, p]) => {
   if (!m && !c && !e && !p) {
      setTimeout(() => { 
        if (!showMemberModal.value && !showCategoryModal.value && !showExpenseModal.value && !showPaymentModal.value) resetModals(); 
      }, 300);
   }
});

// Actions
const handleSaveMember = async () => {
  if (!newMemberName.value) return;
  
  if (editingMember.value) {
     await updateMember(editingMember.value.id, newMemberName.value);
  } else {
     await addMember(newMemberName.value);
  }
  
  showMemberModal.value = false;
  editingMember.value = null;
  newMemberName.value = '';

  if (!editingMember.value) initSplits(); // Only init if new
 
  
  // Onboarding Step 2: Categories
  if (!editingMember.value && categories.value.length === 0) {
    setTimeout(() => { showCategoryModal.value = true; }, 300);
  }
};

const handleDeleteMember = async () => {
   if (!editingMember.value) return;
   await deleteMember(editingMember.value.id);
   showMemberModal.value = false;
};

const handleSaveCategory = async () => {
  if (!newCategoryName.value) return;
  
  if (editingCategory.value) {
      await updateCategory(editingCategory.value.id, newCategoryName.value, newCategoryIcon.value);
      editingCategory.value = null; // Exit edit mode
  } else {
      await addCategory(newCategoryName.value, newCategoryIcon.value);
  }
  
  newCategoryName.value = '';
  newCategoryIcon.value = '📦';
  // Note: we might want to keep modal open to manage more
};

const handleDeleteCategory = async (id: string) => {
    await deleteCategory(id);
    if (editingCategory.value?.id === id) {
        editingCategory.value = null;
        newCategoryName.value = '';
        newCategoryIcon.value = '📦';
    }
};

const handleSeedCategories = async () => {
    await seedDefaultCategories();
    showCategoryModal.value = false;
};

const handleSaveExpense = async () => {
  if (!expenseAmount.value || !expenseTitle.value || !expensePayer.value) return;

  const finalSplits = finaliseExpenseSplits();

  if (editingTransaction.value) {
     await updateTransaction(
        editingTransaction.value.id,
        'expense',
        expenseAmount.value,
        expensePayer.value,
        expenseDate.value,
        expenseTitle.value,
        undefined,
        expenseCategory.value || undefined,
        finalSplits
     );
  } else {
      await addTransaction(
        'expense',
        expenseAmount.value,
        expensePayer.value,
        expenseDate.value,
        expenseTitle.value,
        undefined, // receiver
        expenseCategory.value || undefined, // category
        finalSplits
      );
  }
  
  showExpenseModal.value = false;
  // Reset
  expenseTitle.value = '';
  expenseAmount.value = null;
  expenseCategory.value = '';
};

const handleDeleteTransaction = async () => {
  if (!editingTransaction.value) return;
  if (!confirm('Transaktion wirklich löschen?')) return;
  await deleteTransaction(editingTransaction.value.id);
  showExpenseModal.value = false;
  showPaymentModal.value = false;
};

const handleSavePayment = async () => {
  if (!paymentAmount.value || !paymentPayer.value || !paymentReceiver.value) return;
  
  if (editingTransaction.value) {
      await updateTransaction(
        editingTransaction.value.id,
        'payment',
        paymentAmount.value,
        paymentPayer.value,
        paymentDate.value,
        undefined,
        paymentReceiver.value
      );
  } else {
      await addTransaction(
        'payment',
        paymentAmount.value,
        paymentPayer.value,
        paymentDate.value,
        undefined, // title
        paymentReceiver.value
      );
  }

  showPaymentModal.value = false;
  paymentAmount.value = null;
};
</script>

<template>
  <div class="h-[calc(100vh-96px)] flex flex-col relative w-full overflow-hidden">
    
    <!-- Tab Navigation -->
    <div class="tabs tabs-boxed justify-center m-2 bg-base-200 shrink-0">
      <a 
        v-for="(tab, index) in tabs" 
        :key="tab"
        class="tab" 
        :class="{ 'tab-active': activeTab === index }"
        @click="scrollToTab(index)"
      >
        {{ tab }}
      </a>
    </div>

    <!-- Content -->
    <div 
      class="flex-1 w-full flex overflow-x-auto overflow-y-hidden snap-x snap-mandatory scroll-smooth hide-scrollbar"
      ref="scrollContainer"
      @scroll="handleScroll"
    >
       <div class="w-full h-full shrink-0 snap-start snap-always overflow-y-auto relative">
         <FinanceOverview @edit-member="handleEditMember" @edit-transaction="handleEditTransaction" />
       </div>
       <div class="w-full h-full shrink-0 snap-start snap-always overflow-y-auto relative">
         <FinanceExpenses @edit-member="handleEditMember" @edit-transaction="handleEditTransaction" />
       </div>
       <div class="w-full h-full shrink-0 snap-start snap-always overflow-y-auto relative">
         <FinanceStatistics @edit-member="handleEditMember" @edit-transaction="handleEditTransaction" />
       </div>
    </div>

    <!-- Wizards (create flow) — edits keep using the modals below. -->
    <ExpenseWizard
      :open="showExpenseWizard"
      @close="showExpenseWizard = false"
      @saved="showExpenseWizard = false"
      @edit-categories="showCategoryModal = true"
      @add-member="showExpenseWizard = false; showMemberModal = true"
    />
    <PaymentWizard
      :open="showPaymentWizard"
      @close="showPaymentWizard = false"
      @saved="showPaymentWizard = false"
      @add-member="showPaymentWizard = false; showMemberModal = true"
    />

    <!-- FAB -->
    <div class="fixed bottom-6 right-6 flex flex-col items-end gap-3 z-30">
       
       <!-- Menu Items -->
       <Transition name="slide-up">
         <div v-if="isFabOpen" class="flex flex-col gap-3 items-end mb-2">
            <button @click="showMemberModal = true; isFabOpen = false" class="btn btn-md btn-info shadow-lg gap-2">
              👤 Person
            </button>
            <button @click="showPaymentWizard = true; isFabOpen = false" class="btn btn-md btn-success shadow-lg gap-2">
              💸 Zahlung
            </button>
            <button @click="showExpenseWizard = true; isFabOpen = false" class="btn btn-md btn-primary shadow-lg gap-2">
              🛒 Ausgabe
            </button>
         </div>
       </Transition>

       <!-- Main Button -->
       <button 
         @click="toggleFab" 
         class="btn btn-circle btn-lg shadow-xl transition-transform"
         :class="isFabOpen ? 'btn-error rotate-45' : 'btn-primary'"
       >
         <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
       </button>
    </div>

    <!-- Modal: New Member -->
    <dialog class="modal" :class="{ 'modal-open': showMemberModal }">
       <div class="modal-box">
          <h3 class="font-bold text-lg">{{ editingMember ? 'Person bearbeiten' : 'Neue Person' }}</h3>
          <p class="py-2 text-sm text-gray-500" v-if="members.length === 0 && !editingMember">Willkommen! Füge zuerst die Mitglieder deines Haushalts hinzu.</p>
          <input v-model="newMemberName" type="text" placeholder="Name" class="input input-bordered w-full mt-4" autofocus />
          <div class="modal-action justify-between">
             <button v-if="editingMember" class="btn btn-error btn-outline" @click="handleDeleteMember">Löschen</button>
             <div class="flex gap-2">
                <button class="btn btn-ghost" @click="showMemberModal = false" v-if="members.length > 0">Abbrechen</button>
                <button class="btn btn-primary" @click="handleSaveMember">{{ editingMember ? 'Speichern' : 'Hinzufügen' }}</button>
             </div>
          </div>
       </div>
    </dialog>



    <!-- Modal: New Expense -->
    <dialog class="modal" :class="{ 'modal-open': showExpenseModal }">
       <div class="modal-box">
          <h3 class="font-bold text-lg mb-4">{{ editingTransaction ? 'Ausgabe bearbeiten' : 'Neue Ausgabe' }}</h3>
          
          <div class="form-control mb-2">
            <label class="label">Titel</label>
            <input v-model="expenseTitle" type="text" placeholder="Was wurde gekauft?" class="input input-bordered w-full" />
          </div>

          <div class="flex gap-2 mb-2">
             <div class="form-control flex-1">
               <label class="label">Betrag (€)</label>
               <input v-model="expenseAmount" type="number" step="0.01" class="input input-bordered w-full" />
             </div>
             <div class="form-control flex-1">
               <label class="label">Datum</label>
               <input v-model="expenseDate" type="date" class="input input-bordered w-full" />
             </div>
          </div>

          <div class="form-control mb-2">
             <label class="label">Wer hat bezahlt?</label>
             <select v-model="expensePayer" class="select select-bordered w-full">
                <option disabled value="">Bitte wählen...</option>
                <option v-for="m in members" :key="m.id" :value="m.id">{{ m.name }}</option>
             </select>
          </div>

          <div class="form-control mb-4">
             <label class="label">Kategorie (Optional)</label>
             <div class="join w-full">
                <select v-model="expenseCategory" class="select select-bordered join-item w-full">
                   <option value="">Keine</option>
                   <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.icon }} {{ c.name }}</option>
                </select>
                <button class="btn btn-square join-item" @click="showCategoryModal = true" title="Kategorien bearbeiten">
                   ✏️
                </button>
             </div>
          </div>
          
          <div class="divider text-sm text-gray-500">Für wen?</div>

          <div class="max-h-40 overflow-y-auto space-y-2">
             <div v-for="split in expenseSplits" :key="split.memberId" class="flex items-center gap-2">
                <input type="checkbox" v-model="split.active" @change="handleActiveChange" class="checkbox checkbox-sm" />
                <span class="flex-1 text-sm truncate w-20">{{ split.name }}</span>
                
                <!-- Percentage -->
                <div class="flex items-center" v-if="split.active">
                   <input 
                      v-model.number="split.percentage" 
                      @input="handleSplitChange(split, 'percentage')"
                      type="number" 
                      step="0.1" 
                      class="input input-xs input-bordered w-16 text-right" 
                   />
                   <span class="text-xs ml-1">%</span>
                </div>

                <!-- Amount -->
                <div class="flex items-center" v-if="split.active">
                   <input 
                      v-model="split.amount" 
                      @input="handleSplitChange(split, 'amount')"
                      @blur="split.amount = Number(split.amount).toFixed(2)"
                      type="number" 
                      step="0.01" 
                      class="input input-xs input-bordered w-20 text-right" 
                   />
                   <span class="text-xs ml-1">€</span>
                </div>
             </div>
          </div>

          <div class="modal-action justify-between">
             <button v-if="editingTransaction" class="btn btn-error btn-outline" @click="handleDeleteTransaction">Löschen</button>
             <div class="flex gap-2">
                <button class="btn btn-ghost" @click="showExpenseModal = false">Abbrechen</button>
                <button class="btn btn-primary" @click="handleSaveExpense">Speichern</button>
             </div>
          </div>
       </div>
    </dialog>

    <!-- Modal: New Payment -->
    <dialog class="modal" :class="{ 'modal-open': showPaymentModal }">
       <div class="modal-box">
          <h3 class="font-bold text-lg mb-4">{{ editingTransaction ? 'Zahlung bearbeiten' : 'Neue Zahlung' }}</h3>
          
          <div class="form-control mb-2">
             <label class="label">Von</label>
             <select v-model="paymentPayer" class="select select-bordered w-full">
                <option v-for="m in members" :key="m.id" :value="m.id">{{ m.name }}</option>
             </select>
          </div>

           <div class="form-control mb-2">
             <label class="label">An</label>
             <select v-model="paymentReceiver" class="select select-bordered w-full">
                <option v-for="m in members" :key="m.id" :value="m.id">{{ m.name }}</option>
             </select>
          </div>

          <div class="flex gap-2 mb-4">
             <div class="form-control flex-1">
               <label class="label">Betrag (€)</label>
               <input v-model="paymentAmount" type="number" step="0.01" class="input input-bordered w-full" />
             </div>
             <div class="form-control flex-1">
               <label class="label">Datum</label>
               <input v-model="paymentDate" type="date" class="input input-bordered w-full" />
             </div>
          </div>

          <div class="modal-action justify-between">
             <button v-if="editingTransaction" class="btn btn-error btn-outline" @click="handleDeleteTransaction">Löschen</button>
             <div class="flex gap-2">
                 <button class="btn btn-ghost" @click="showPaymentModal = false">Abbrechen</button>
                 <button class="btn btn-success" @click="handleSavePayment">{{ editingTransaction ? 'Speichern' : 'Zahlung buchen' }}</button>
             </div>
          </div>
       </div>
    </dialog>

  </div>
  
    <!-- Modal: Categories (Onboarding & Manage) -->
    <dialog class="modal" :class="{ 'modal-open': showCategoryModal }" style="z-index: 9999;">
       <div class="modal-box">
          <h3 class="font-bold text-lg">Kategorien verwalten</h3>
          <p class="py-2 text-sm text-gray-500" v-if="categories.length === 0">Erstelle Kategorien oder nutze die Standards.</p>
          
          <div class="flex gap-2 mt-4 items-end">
             <div class="form-control">
                <label class="label py-0"><span class="label-text-alt">Icon</span></label>
                <input v-model="newCategoryIcon" type="text" class="input input-bordered w-14 text-center px-0" placeholder="Icon" />
             </div>
             <div class="form-control flex-1">
                <label class="label py-0"><span class="label-text-alt">Name</span></label>
                <input v-model="newCategoryName" type="text" placeholder="Neue Kategorie Name" class="input input-bordered w-full" @keyup.enter="handleSaveCategory"/>
             </div>
             <button class="btn btn-square" :class="editingCategory ? 'btn-success' : ''" @click="handleSaveCategory" :disabled="!newCategoryName">
                {{ editingCategory ? '✓' : '+' }}
             </button>
             <button v-if="editingCategory" class="btn btn-square btn-ghost" @click="editingCategory = null; newCategoryName = ''; newCategoryIcon = '📦'">
                ✕
             </button>
          </div>

          <div class="divider">Vorhanden</div>
          
          <div class="flex flex-wrap gap-2 max-h-60 overflow-y-auto content-start">
             <div 
               v-for="c in categories" 
               :key="c.id" 
               class="badge badge-lg gap-2 cursor-pointer hover:bg-base-300 transition-colors py-4 pr-1"
               :class="editingCategory?.id === c.id ? 'badge-primary' : ''"
               @click="handleEditCategory(c)"
             >
                {{ c.icon }} {{ c.name }}
                <button 
                  v-if="editingCategory?.id === c.id" 
                  class="btn btn-ghost btn-xs btn-circle text-error ml-1" 
                  @click.stop="handleDeleteCategory(c.id)"
                >
                  ✕
                </button>
             </div>
             <div v-if="categories.length === 0" class="text-sm text-gray-400 italic w-full text-center">Keine Kategorien.</div>
          </div>

          <div class="modal-action justify-between items-center">
             <button v-if="categories.length === 0" class="btn btn-outline btn-secondary btn-sm" @click="handleSeedCategories">
                Zauberstab: Standards laden ✨
             </button>
             <div v-else></div> <!-- Spacer -->
             
             <button class="btn btn-primary" @click="showCategoryModal = false">Fertig</button>
          </div>
       </div>
    </dialog>
</template>

<style scoped>
.hide-scrollbar {
  -ms-overflow-style: none;  /* IE and Edge */
  scrollbar-width: none;  /* Firefox */
}
.hide-scrollbar::-webkit-scrollbar {
  display: none;
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.2s ease;
}
.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
</style>
