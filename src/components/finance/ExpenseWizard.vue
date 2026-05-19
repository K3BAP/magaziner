<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';
import { useFinance } from '../../composables/useFinance';
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

const { members, categories, addTransaction } = useFinance();

// -- Step state --
type Step = 1 | 2 | 3 | 4 | 5;
const step = ref<Step>(1);

// -- Form state --
const amountInput = ref<string>(''); // string so we can show empty + decimals naturally
const amount = computed(() => {
  const n = parseFloat(amountInput.value.replace(',', '.'));
  return Number.isFinite(n) ? n : NaN;
});
const title = ref('');
const categoryId = ref<string>(''); // '' === keine
const payerId = ref<string>('');
const date = ref(new Date().toISOString().split('T')[0]);

// Splits — same shape and helpers as FinanceView.vue.
// TODO: consolidate with FinanceView once the edit modal is also migrated.
interface UI_Split {
  memberId: string;
  name: string;
  amount: string;
  percentage: number;
  active: boolean;
}
const splits = ref<UI_Split[]>([]);

const initSplits = () => {
  const count = members.value.length;
  if (count === 0) {
    splits.value = [];
    return;
  }
  const equalPercent = 100 / count;
  const total = Number.isFinite(amount.value) ? amount.value : 0;
  const equalAmount = total / count;
  splits.value = members.value.map((m) => ({
    memberId: m.id,
    name: m.name,
    active: true,
    percentage: Number(equalPercent.toFixed(2)),
    amount: equalAmount.toFixed(2),
  }));
};

const distributeRest = (sourceId: string | null, newTotalPercent: number) => {
  const total = Number.isFinite(amount.value) ? amount.value : 0;
  const active = splits.value.filter((s) => s.active);
  const others = active.filter((s) => s.memberId !== sourceId);
  if (others.length === 0) return;
  const currentOthersTotalPercent = others.reduce((acc, s) => acc + s.percentage, 0);
  const remainingPercent = 100 - newTotalPercent;
  const ratio = currentOthersTotalPercent > 0 ? remainingPercent / currentOthersTotalPercent : 0;
  const useEqual = currentOthersTotalPercent === 0;
  others.forEach((s) => {
    if (useEqual) {
      s.percentage = remainingPercent / others.length;
    } else {
      s.percentage = s.percentage * ratio;
    }
    const amt = (s.percentage / 100) * total;
    s.percentage = Number(s.percentage.toFixed(2));
    s.amount = amt.toFixed(2);
  });
};

const handleSplitChange = (split: UI_Split, type: 'amount' | 'percentage') => {
  const total = Number.isFinite(amount.value) ? amount.value : 0;
  if (type === 'amount') {
    const numAmount = Number(split.amount);
    split.percentage = total > 0 ? (numAmount / total) * 100 : 0;
    split.percentage = Number(split.percentage.toFixed(2));
  } else {
    const amt = (split.percentage / 100) * total;
    split.amount = amt.toFixed(2);
  }
  distributeRest(split.memberId, split.percentage);
};

const handleActiveChange = () => {
  const active = splits.value.filter((s) => s.active);
  if (active.length === 0) return;
  const equalPercent = 100 / active.length;
  const total = Number.isFinite(amount.value) ? amount.value : 0;
  splits.value.forEach((s) => {
    if (s.active) {
      s.percentage = Number(equalPercent.toFixed(2));
      const amt = (equalPercent / 100) * total;
      s.amount = amt.toFixed(2);
    } else {
      s.percentage = 0;
      s.amount = '0.00';
    }
  });
};

// When the amount changes, keep the per-split € figures consistent with the %.
watch(amount, (newVal) => {
  const total = Number.isFinite(newVal) ? newVal : 0;
  splits.value.forEach((s) => {
    const amt = (s.percentage / 100) * total;
    s.amount = amt.toFixed(2);
  });
});

// -- Lifecycle --
const reset = () => {
  step.value = 1;
  amountInput.value = '';
  title.value = '';
  categoryId.value = '';
  payerId.value = '';
  date.value = new Date().toISOString().split('T')[0];
  splits.value = [];
  saving.value = false;
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
watch(step, async (s, prev) => {
  if (s === 5 && (!splits.value.length || splits.value.length !== members.value.length)) {
    initSplits();
  }
  if (s === 1 && prev !== 1) {
    await nextTick();
    amountInputEl.value?.focus();
  }
  if (s === 2 && prev !== 2) {
    await nextTick();
    titleInputEl.value?.focus();
    // Move cursor to end so back-and-forth doesn't wipe the title selection
    const el = titleInputEl.value;
    if (el) el.setSelectionRange(el.value.length, el.value.length);
  }
});

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
    step.value = (step.value - 1) as Step;
  }
};

const goNext = () => {
  if (!canAdvance.value) return;
  if (step.value < 5) {
    step.value = (step.value + 1) as Step;
  } else {
    save();
  }
};

// Tile-style selection auto-advances to the next step.
const pickCategory = (id: string) => {
  categoryId.value = id;
  step.value = 4;
};
const pickPayer = (id: string) => {
  payerId.value = id;
  step.value = 5;
};

// -- Save --
const saving = ref(false);
const errorMsg = ref<string | null>(null);

const save = async () => {
  if (!canAdvance.value || saving.value) return;
  saving.value = true;
  errorMsg.value = null;
  try {
    const activeSplits = splits.value.filter((s) => s.active);
    // Normalise the last cent of rounding error onto the first active split.
    const currentTotal = activeSplits.reduce((acc, s) => acc + Number(s.amount), 0);
    const diff = amount.value - currentTotal;
    if (Math.abs(diff) > 0.001 && activeSplits.length > 0) {
      const newValue = Number(activeSplits[0].amount) + diff;
      activeSplits[0].amount = newValue.toFixed(2);
    }
    const finalSplits = activeSplits.map((s) => ({
      member_id: s.memberId,
      amount: Number(s.amount),
      percentage: s.percentage,
    }));

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
    emit('saved');
  } catch (e: any) {
    errorMsg.value = e?.message ?? 'Speichern fehlgeschlagen.';
  } finally {
    saving.value = false;
  }
};

const stepLabels = ['Betrag', 'Titel', 'Kategorie', 'Bezahlt von', 'Aufteilung'];
</script>

<template>
  <Teleport to="body">
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
      <section class="flex-1 overflow-y-auto px-4 py-6">
        <!-- Step 1: Amount -->
        <div v-if="step === 1" :key="'s1'" class="animate-fade-in flex flex-col items-center gap-4">
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
        <div v-else-if="step === 2" :key="'s2'" class="animate-fade-in flex flex-col gap-3">
          <label class="text-sm text-base-content/60">Was wurde gekauft?</label>
          <input
            ref="titleInputEl"
            v-model="title"
            type="text"
            placeholder="z. B. Wocheneinkauf"
            class="input input-bordered input-lg w-full"
            @keyup.enter="goNext"
          />
        </div>

        <!-- Step 3: Category -->
        <div v-else-if="step === 3" :key="'s3'" class="animate-fade-in flex flex-col gap-3">
          <label class="text-sm text-base-content/60">Welche Kategorie?</label>
          <div class="grid grid-cols-3 gap-2">
            <button
              type="button"
              class="btn h-20 flex-col gap-1 normal-case"
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
              class="btn h-20 flex-col gap-1 normal-case"
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
        <div v-else-if="step === 4" :key="'s4'" class="animate-fade-in flex flex-col gap-3">
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
              class="btn h-20 flex-col gap-1 normal-case"
              :class="payerId === m.id ? 'btn-primary' : 'btn-outline'"
              @click="pickPayer(m.id)"
            >
              <span class="text-2xl leading-none">👤</span>
              <span class="text-sm truncate max-w-full">{{ m.name }}</span>
            </button>
          </div>
        </div>

        <!-- Step 5: Splits + Date -->
        <div v-else-if="step === 5" :key="'s5'" class="animate-fade-in flex flex-col gap-4">
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
      </section>

      <!-- Footer -->
      <footer class="px-4 py-3 border-t border-base-300 shrink-0">
        <button
          type="button"
          class="btn btn-primary btn-block btn-lg gap-2"
          :disabled="!canAdvance || saving"
          @click="goNext"
        >
          <span v-if="saving" class="loading loading-spinner loading-sm" />
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
  </Teleport>
</template>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.25s ease-out;
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
</style>
