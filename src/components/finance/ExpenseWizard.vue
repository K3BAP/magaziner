<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';
import { useFinance } from '../../composables/useFinance';
import { useExpenseSplits } from '../../composables/useExpenseSplits';
import {
  ArrowLeftIcon,
  XMarkIcon,
  CheckIcon,
  ArrowRightIcon,
  PencilSquareIcon,
} from '@heroicons/vue/24/outline';

const props = defineProps<{ open: boolean }>();
const emit = defineEmits<{
  close: [];
  saved: [];
  'edit-categories': [];
  'add-member': [];
}>();

const { members, categories, transactions, addTransaction } = useFinance();

// -- Step state --
type Step = 1 | 2 | 3 | 4 | 5;
const step = ref<Step>(1);
// Drives the direction of the step-transition (slide-in from right vs. left).
// Updated by every navigation entry-point before `step` changes.
const direction = ref<'forward' | 'back'>('forward');

// -- Form state --
const amountInput = ref<string>(''); // string so we can show empty + decimals naturally
const amount = computed(() => {
  const n = parseFloat(amountInput.value.replace(',', '.'));
  return Number.isFinite(n) ? n : NaN;
});
const title = ref('');

// Tappable title suggestions drawn from past expenses, ranked by how often each
// title was used (so staples like "Wocheneinkauf" surface first). The list also
// narrows against what's already typed, acting as a lightweight autocomplete.
const titleSuggestions = computed(() => {
  const counts = new Map<string, { label: string; n: number }>();
  for (const t of transactions.value) {
    if (t.type !== 'expense') continue;
    const label = t.title?.trim();
    if (!label) continue;
    const key = label.toLowerCase();
    const entry = counts.get(key);
    if (entry) entry.n++;
    else counts.set(key, { label, n: 1 });
  }
  const q = title.value.trim().toLowerCase();
  return [...counts.values()]
    .filter((e) => e.label.toLowerCase() !== q && (!q || e.label.toLowerCase().includes(q)))
    .sort((a, b) => b.n - a.n)
    .slice(0, 5)
    .map((e) => e.label);
});

const categoryId = ref<string>(''); // '' === keine
const payerId = ref<string>('');
const date = ref(new Date().toISOString().split('T')[0]);

// Split math (init, redistribute, normalise) lives in a shared composable so
// the edit modal in FinanceView and this wizard stay in lockstep.
const {
  splits,
  initEqual: initSplits,
  onFieldEdit: handleSplitChange,
  onActiveToggle: handleActiveChange,
  finaliseForSave: finaliseSplits,
} = useExpenseSplits(members, amount);

// -- Lifecycle --
const reset = () => {
  step.value = 1;
  direction.value = 'forward';
  amountInput.value = '';
  title.value = '';
  categoryId.value = '';
  payerId.value = '';
  date.value = new Date().toISOString().split('T')[0];
  splits.value = [];
  saving.value = false;
  justSaved.value = false;
  errorMsg.value = null;
};

// Autofocus management — Vue's :ref isn't enough on dynamic v-if blocks here.
const amountInputEl = ref<HTMLInputElement | null>(null);
const titleInputEl = ref<HTMLInputElement | null>(null);

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

// When the user reaches step 5 for the first time, seed equal splits.
// Focus is *not* set here — with the step <Transition mode="out-in"> the next
// step's DOM doesn't exist yet when this fires. See `onStepEntered` below,
// which the Transition's after-enter hook calls once mounting is complete.
watch(step, (s) => {
  if (s === 5 && (!splits.value.length || splits.value.length !== members.value.length)) {
    initSplits();
  }
});

// Called by the step <Transition>'s @after-enter — at this point the new
// step's template ref is bound and we can safely move focus.
const onStepEntered = () => {
  if (step.value === 1) {
    amountInputEl.value?.focus();
  } else if (step.value === 2) {
    const el = titleInputEl.value;
    if (el) {
      el.focus();
      // Place caret at the end so re-entering the step keeps the typed text editable.
      el.setSelectionRange(el.value.length, el.value.length);
    }
  }
};

// Fill the title from a suggestion chip and keep the input focused so the user
// can still tweak the text before continuing (we deliberately don't auto-advance).
const pickSuggestion = (s: string) => {
  title.value = s;
  titleInputEl.value?.focus();
};

// -- Validation per step --
const canAdvance = computed(() => {
  switch (step.value) {
    case 1:
      return Number.isFinite(amount.value) && amount.value > 0;
    case 2:
      return title.value.trim().length > 0;
    case 3:
      return true; // category is optional, "Keine" is a valid choice
    case 4:
      return !!payerId.value;
    case 5: {
      const active = splits.value.filter((s) => s.active);
      if (active.length === 0) return false;
      const sum = active.reduce((acc, s) => acc + Number(s.amount || 0), 0);
      // Allow a tiny rounding tolerance; the save handler normalises to exact total.
      return Math.abs(sum - amount.value) < 0.05;
    }
  }
  return false;
});

const splitsSum = computed(() =>
  splits.value.filter((s) => s.active).reduce((acc, s) => acc + Number(s.amount || 0), 0)
);

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
  if (step.value < 5) {
    direction.value = 'forward';
    step.value = (step.value + 1) as Step;
  } else {
    save();
  }
};

// Tile-style selection auto-advances to the next step.
const pickCategory = (id: string) => {
  categoryId.value = id;
  direction.value = 'forward';
  step.value = 4;
};
const pickPayer = (id: string) => {
  payerId.value = id;
  direction.value = 'forward';
  step.value = 5;
};

// -- Save --
// Three-phase save UX: `saving` shows a spinner during the network call,
// `justSaved` keeps a green checkmark visible for a beat so the user sees
// confirmation before the wizard slides away. `justSaved` is cleared by
// `reset()` on the next open (not after `emit('saved')`) so the checkmark
// stays on screen during the wizard's exit transition.
const saving = ref(false);
const justSaved = ref(false);
const errorMsg = ref<string | null>(null);

const save = async () => {
  if (!canAdvance.value || saving.value || justSaved.value) return;
  saving.value = true;
  errorMsg.value = null;
  try {
    const finalSplits = finaliseSplits();
    const result = await addTransaction(
      'expense',
      amount.value,
      payerId.value,
      date.value,
      title.value.trim(),
      undefined,
      categoryId.value || undefined,
      finalSplits
    );
    if (!result) throw new Error('Speichern fehlgeschlagen.');
    saving.value = false;
    justSaved.value = true;
    // Let the checkmark linger long enough to read, then close.
    setTimeout(() => emit('saved'), 650);
  } catch (e: any) {
    errorMsg.value = e?.message ?? 'Speichern fehlgeschlagen.';
    saving.value = false;
  }
};

const stepLabels = ['Betrag', 'Titel', 'Kategorie', 'Bezahlt von', 'Aufteilung'];
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
          <h1 class="font-bold text-base leading-tight truncate">Neue Ausgabe</h1>
          <p class="text-xs text-base-content/60">
            Schritt {{ step }} von 5 · {{ stepLabels[step - 1] }}
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
          <label class="text-sm text-base-content/60">Wie viel hast du ausgegeben?</label>
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

        <!-- Step 2: Title -->
        <div v-else-if="step === 2" :key="2" class="flex flex-col gap-3">
          <label class="text-sm text-base-content/60">Was wurde gekauft?</label>
          <input
            ref="titleInputEl"
            v-model="title"
            type="text"
            placeholder="z. B. Wocheneinkauf"
            class="input input-bordered input-lg w-full"
            @keyup.enter="goNext"
          />
          <div v-if="titleSuggestions.length" class="flex flex-wrap gap-2">
            <button
              v-for="s in titleSuggestions"
              :key="s"
              type="button"
              class="badge badge-lg badge-outline gap-1 cursor-pointer hover:badge-primary active:scale-95 transition-transform"
              @click="pickSuggestion(s)"
            >
              {{ s }}
            </button>
          </div>
        </div>

        <!-- Step 3: Category -->
        <div v-else-if="step === 3" :key="3" class="flex flex-col gap-3">
          <label class="text-sm text-base-content/60">Welche Kategorie?</label>
          <div class="grid grid-cols-3 gap-2">
            <button
              type="button"
              class="btn h-20 flex-col gap-1 normal-case active:scale-95 transition-transform duration-100"
              :class="categoryId === '' ? 'btn-primary' : 'btn-outline'"
              @click="pickCategory('')"
            >
              <span class="text-2xl leading-none">∅</span>
              <span class="text-xs">Keine</span>
            </button>
            <button
              v-for="c in categories"
              :key="c.id"
              type="button"
              class="btn h-20 flex-col gap-1 normal-case active:scale-95 transition-transform duration-100"
              :class="categoryId === c.id ? 'btn-primary' : 'btn-outline'"
              @click="pickCategory(c.id)"
            >
              <span class="text-2xl leading-none">{{ c.icon }}</span>
              <span class="text-xs truncate max-w-full">{{ c.name }}</span>
            </button>
            <button
              type="button"
              class="btn btn-ghost h-20 flex-col gap-1 normal-case border border-dashed border-base-300"
              @click="emit('edit-categories')"
            >
              <PencilSquareIcon class="h-5 w-5" />
              <span class="text-xs">Bearbeiten</span>
            </button>
          </div>
        </div>

        <!-- Step 4: Payer -->
        <div v-else-if="step === 4" :key="4" class="flex flex-col gap-3">
          <label class="text-sm text-base-content/60">Wer hat bezahlt?</label>
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

        <!-- Step 5: Splits + Date -->
        <div v-else-if="step === 5" :key="5" class="flex flex-col gap-4">
          <div>
            <label class="text-sm text-base-content/60">Für wen?</label>
            <p class="text-xs text-base-content/50 mt-1">
              Standardmäßig wird gleichmäßig aufgeteilt. Tippe Beträge oder Prozente an, um anzupassen.
            </p>
          </div>

          <div class="flex flex-col gap-2">
            <div
              v-for="s in splits"
              :key="s.memberId"
              class="flex items-center gap-2"
            >
              <input
                type="checkbox"
                v-model="s.active"
                class="checkbox checkbox-sm"
                @change="handleActiveChange"
              />
              <span class="flex-1 text-sm truncate">{{ s.name }}</span>
              <div v-if="s.active" class="flex items-center">
                <input
                  v-model.number="s.percentage"
                  type="number"
                  step="0.1"
                  inputmode="decimal"
                  class="input input-xs input-bordered w-16 text-right"
                  @input="handleSplitChange(s, 'percentage')"
                />
                <span class="text-xs ml-1">%</span>
              </div>
              <div v-if="s.active" class="flex items-center">
                <input
                  v-model="s.amount"
                  type="number"
                  step="0.01"
                  inputmode="decimal"
                  class="input input-xs input-bordered w-20 text-right"
                  @input="handleSplitChange(s, 'amount')"
                  @blur="s.amount = Number(s.amount).toFixed(2)"
                />
                <span class="text-xs ml-1">€</span>
              </div>
            </div>
          </div>

          <div class="flex items-center justify-between text-xs px-1">
            <span class="text-base-content/60">Summe</span>
            <span
              :class="Math.abs(splitsSum - amount) < 0.05 ? 'text-success' : 'text-error'"
              class="font-mono"
            >
              {{ splitsSum.toFixed(2) }} € / {{ Number.isFinite(amount) ? amount.toFixed(2) : '0.00' }} €
            </span>
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
          class="btn btn-block btn-lg gap-2"
          :class="justSaved ? 'btn-success' : 'btn-primary'"
          :disabled="!canAdvance || saving || justSaved"
          @click="goNext"
        >
          <template v-if="justSaved">
            <CheckIcon class="h-5 w-5 animate-pop" />
            Gespeichert
          </template>
          <template v-else-if="saving">
            <span class="loading loading-spinner loading-sm" />
          </template>
          <template v-else-if="step === 5">
            <CheckIcon class="h-5 w-5" />
            Speichern
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
/* Going forward: new step slides in from the right, old step exits to the left. */
.step-forward-enter-from {
  transform: translateX(36px);
  opacity: 0;
}
.step-forward-leave-to {
  transform: translateX(-36px);
  opacity: 0;
}
/* Going back: mirror image. */
.step-back-enter-from {
  transform: translateX(-36px);
  opacity: 0;
}
.step-back-leave-to {
  transform: translateX(36px);
  opacity: 0;
}

/* --- Save success: little spring on the checkmark so the win feels earned. */
.animate-pop {
  animation: pop 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}
@keyframes pop {
  0%   { transform: scale(0);   opacity: 0; }
  60%  { transform: scale(1.2); opacity: 1; }
  100% { transform: scale(1);   opacity: 1; }
}
</style>
