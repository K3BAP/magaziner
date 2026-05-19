<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';
import { useFinance } from '../../composables/useFinance';
import {
  ArrowLeftIcon,
  XMarkIcon,
  CheckIcon,
  ArrowRightIcon,
} from '@heroicons/vue/24/outline';

const props = defineProps<{ open: boolean }>();
const emit = defineEmits<{
  close: [];
  saved: [];
  'add-member': [];
}>();

const { members, addTransaction } = useFinance();

type Step = 1 | 2 | 3;
const step = ref<Step>(1);
// Drives the step-transition direction; mirrors ExpenseWizard.
const direction = ref<'forward' | 'back'>('forward');

const amountInput = ref<string>('');
const amount = computed(() => {
  const n = parseFloat(amountInput.value.replace(',', '.'));
  return Number.isFinite(n) ? n : NaN;
});
const payerId = ref<string>('');
const receiverId = ref<string>('');
const date = ref(new Date().toISOString().split('T')[0]);

// Three-phase save UX (matches ExpenseWizard): saving → justSaved → emit.
const saving = ref(false);
const justSaved = ref(false);
const errorMsg = ref<string | null>(null);

const amountInputEl = ref<HTMLInputElement | null>(null);

const reset = () => {
  step.value = 1;
  direction.value = 'forward';
  amountInput.value = '';
  payerId.value = '';
  receiverId.value = '';
  date.value = new Date().toISOString().split('T')[0];
  saving.value = false;
  justSaved.value = false;
  errorMsg.value = null;
};

watch(
  () => props.open,
  async (o) => {
    if (o) {
      reset();
      await nextTick();
      amountInputEl.value?.focus();
    }
  }
);

// Focus is handled by the step <Transition>'s @after-enter so that the
// new step's DOM has finished mounting before we try to grab the ref.
const onStepEntered = () => {
  if (step.value === 1) {
    amountInputEl.value?.focus();
  }
};

const canAdvance = computed(() => {
  switch (step.value) {
    case 1:
      return Number.isFinite(amount.value) && amount.value > 0;
    case 2:
      return !!payerId.value;
    case 3:
      return !!receiverId.value && receiverId.value !== payerId.value;
  }
  return false;
});

const goBack = () => {
  if (saving.value) return;
  if (step.value === 1) {
    emit('close');
  } else {
    direction.value = 'back';
    step.value = (step.value - 1) as Step;
  }
};

const goNext = () => {
  if (!canAdvance.value) return;
  if (step.value < 3) {
    direction.value = 'forward';
    step.value = (step.value + 1) as Step;
  } else {
    save();
  }
};

const pickPayer = (id: string) => {
  payerId.value = id;
  // If the previously-chosen receiver is now the same as the payer, clear it.
  if (receiverId.value === id) receiverId.value = '';
  direction.value = 'forward';
  step.value = 3;
};

const pickReceiver = (id: string) => {
  if (id === payerId.value) return;
  receiverId.value = id;
};

const save = async () => {
  if (!canAdvance.value || saving.value || justSaved.value) return;
  saving.value = true;
  errorMsg.value = null;
  try {
    const result = await addTransaction(
      'payment',
      amount.value,
      payerId.value,
      date.value,
      undefined,
      receiverId.value
    );
    if (!result) throw new Error('Speichern fehlgeschlagen.');
    saving.value = false;
    justSaved.value = true;
    setTimeout(() => emit('saved'), 650);
  } catch (e: any) {
    errorMsg.value = e?.message ?? 'Speichern fehlgeschlagen.';
    saving.value = false;
  }
};

const stepLabels = ['Betrag', 'Von', 'An'];
</script>

<template>
  <Teleport to="body">
    <Transition name="wizard">
    <div
      v-if="open"
      class="fixed inset-0 z-50 bg-base-100 flex flex-col"
      role="dialog"
      aria-modal="true"
    >
      <!-- Header -->
      <header class="flex items-center gap-2 px-3 py-3 border-b border-base-300 shrink-0">
        <button
          type="button"
          class="btn btn-ghost btn-circle btn-sm"
          :disabled="saving"
          @click="goBack"
          :aria-label="step === 1 ? 'Schließen' : 'Zurück'"
        >
          <ArrowLeftIcon class="h-5 w-5" />
        </button>
        <div class="flex-1 min-w-0">
          <h1 class="font-bold text-base leading-tight truncate">Neue Zahlung</h1>
          <p class="text-xs text-base-content/60">
            Schritt {{ step }} von 3 · {{ stepLabels[step - 1] }}
          </p>
        </div>
        <button
          type="button"
          class="btn btn-ghost btn-circle btn-sm"
          :disabled="saving"
          @click="emit('close')"
          aria-label="Abbrechen"
        >
          <XMarkIcon class="h-5 w-5" />
        </button>
      </header>

      <!-- Progress -->
      <ul class="steps w-full text-xs px-3 pt-3 shrink-0">
        <li
          v-for="(label, i) in stepLabels"
          :key="label"
          class="step"
          :class="{ 'step-primary': step >= (i + 1) }"
        >
          {{ label }}
        </li>
      </ul>

      <!-- Body -->
      <section class="flex-1 overflow-y-auto px-4 py-6 relative">
        <Transition :name="'step-' + direction" mode="out-in" @after-enter="onStepEntered">
        <!-- Step 1: Amount -->
        <div v-if="step === 1" :key="1" class="flex flex-col items-center gap-4">
          <label class="text-sm text-base-content/60">Wie viel wurde überwiesen?</label>
          <div class="flex items-baseline gap-2">
            <input
              ref="amountInputEl"
              v-model="amountInput"
              type="text"
              inputmode="decimal"
              autocomplete="off"
              pattern="[0-9.,]*"
              placeholder="0,00"
              class="input input-bordered input-lg text-4xl text-center font-bold w-48"
              @keyup.enter="goNext"
            />
            <span class="text-3xl font-bold text-base-content/60">€</span>
          </div>
        </div>

        <!-- Step 2: Payer -->
        <div v-else-if="step === 2" :key="2" class="flex flex-col gap-3">
          <label class="text-sm text-base-content/60">Von wem?</label>
          <div v-if="members.length === 0" class="alert alert-warning text-sm">
            <span>Keine Mitglieder vorhanden.</span>
            <button class="btn btn-sm btn-primary" @click="emit('add-member')">
              Person hinzufügen
            </button>
          </div>
          <div v-else class="grid grid-cols-2 gap-2">
            <button
              v-for="m in members"
              :key="m.id"
              type="button"
              class="btn h-20 flex-col gap-1 normal-case active:scale-95 transition-transform duration-100"
              :class="payerId === m.id ? 'btn-primary' : 'btn-outline'"
              @click="pickPayer(m.id)"
            >
              <span class="text-2xl leading-none">👤</span>
              <span class="text-sm truncate max-w-full">{{ m.name }}</span>
            </button>
          </div>
        </div>

        <!-- Step 3: Receiver + Date -->
        <div v-else-if="step === 3" :key="3" class="flex flex-col gap-4">
          <div>
            <label class="text-sm text-base-content/60">An wen?</label>
          </div>
          <div class="grid grid-cols-2 gap-2">
            <button
              v-for="m in members"
              :key="m.id"
              type="button"
              class="btn h-20 flex-col gap-1 normal-case active:scale-95 transition-transform duration-100"
              :class="[
                m.id === payerId
                  ? 'btn-disabled opacity-40'
                  : receiverId === m.id
                    ? 'btn-success'
                    : 'btn-outline',
              ]"
              :disabled="m.id === payerId"
              @click="pickReceiver(m.id)"
            >
              <span class="text-2xl leading-none">👤</span>
              <span class="text-sm truncate max-w-full">{{ m.name }}</span>
            </button>
          </div>

          <div class="divider my-1" />

          <div class="form-control">
            <label class="label py-1">
              <span class="label-text-alt">Datum</span>
            </label>
            <input
              v-model="date"
              type="date"
              class="input input-bordered input-sm w-full"
            />
          </div>

          <p v-if="errorMsg" class="text-error text-sm">{{ errorMsg }}</p>
        </div>
        </Transition>
      </section>

      <!-- Footer -->
      <footer class="px-4 py-3 border-t border-base-300 shrink-0">
        <button
          type="button"
          class="btn btn-success btn-block btn-lg gap-2"
          :disabled="!canAdvance || saving || justSaved"
          @click="goNext"
        >
          <template v-if="justSaved">
            <CheckIcon class="h-5 w-5 animate-pop" />
            Gebucht
          </template>
          <template v-else-if="saving">
            <span class="loading loading-spinner loading-sm" />
          </template>
          <template v-else-if="step === 3">
            <CheckIcon class="h-5 w-5" />
            Zahlung buchen
          </template>
          <template v-else>
            Weiter
            <ArrowRightIcon class="h-5 w-5" />
          </template>
        </button>
      </footer>
    </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* --- Wizard entrance/exit: slide up from the bottom edge of the viewport. */
.wizard-enter-active,
.wizard-leave-active {
  transition: transform 0.3s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.3s ease;
}
.wizard-enter-from,
.wizard-leave-to {
  transform: translateY(100%);
  opacity: 0.6;
}

/* --- Step transitions: slide horizontally based on travel direction. */
.step-forward-enter-active,
.step-forward-leave-active,
.step-back-enter-active,
.step-back-leave-active {
  transition: transform 0.22s ease, opacity 0.22s ease;
}
.step-forward-enter-from {
  transform: translateX(36px);
  opacity: 0;
}
.step-forward-leave-to {
  transform: translateX(-36px);
  opacity: 0;
}
.step-back-enter-from {
  transform: translateX(-36px);
  opacity: 0;
}
.step-back-leave-to {
  transform: translateX(36px);
  opacity: 0;
}

/* --- Save success: small spring on the checkmark. */
.animate-pop {
  animation: pop 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}
@keyframes pop {
  0%   { transform: scale(0);   opacity: 0; }
  60%  { transform: scale(1.2); opacity: 1; }
  100% { transform: scale(1);   opacity: 1; }
}
</style>
