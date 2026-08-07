<script setup lang="ts">
import { useExpenseFilter } from '../../composables/useExpenseFilter';
import { formatCurrency } from '../../utils/currency';
import { MagnifyingGlassIcon, XMarkIcon, AdjustmentsHorizontalIcon } from '@heroicons/vue/24/outline';

const emit = defineEmits<{ (e: 'open-filters'): void }>();

const {
  query,
  activeChips,
  activeFilterCount,
  hasActiveFilters,
  resultCount,
  sumExpenses,
  sumPayments,
  resetFilters,
} = useExpenseFilter();
</script>

<template>
  <!--
    Sticky inside FinanceExpenses' own scroller. z-20 keeps it below the FAB
    (z-30) and the filter sheet (z-999). `touch-pan-y` stops a horizontal drag
    that starts on the search bar from swiping to the next finance tab.
  -->
  <div class="sticky top-0 z-20 bg-base-100/95 backdrop-blur border-b border-base-200 touch-pan-y">
    <div class="flex items-center gap-2 p-3">
      <label class="input input-bordered input-sm flex-1 flex items-center gap-2">
        <MagnifyingGlassIcon class="h-4 w-4 opacity-50 shrink-0" />
        <input
          v-model="query"
          type="search"
          inputmode="search"
          enterkeyhint="search"
          autocomplete="off"
          placeholder="Titel, Person, Kategorie…"
          class="grow min-w-0"
          @keyup.enter="($event.target as HTMLInputElement).blur()"
        />
        <button
          v-if="query"
          class="btn btn-ghost btn-xs btn-circle"
          title="Suche leeren"
          @click="query = ''"
        >
          <XMarkIcon class="h-4 w-4" />
        </button>
      </label>

      <div class="indicator shrink-0">
        <span v-if="activeFilterCount" class="indicator-item badge badge-primary badge-xs">
          {{ activeFilterCount }}
        </span>
        <button
          class="btn btn-sm btn-square"
          :class="activeFilterCount ? 'btn-primary btn-outline' : 'btn-ghost'"
          title="Filter"
          @click="emit('open-filters')"
        >
          <AdjustmentsHorizontalIcon class="h-5 w-5" />
        </button>
      </div>
    </div>

    <!--
      flex-wrap, not overflow-x-auto: a nested horizontal scroller inside the
      snap-x pane would hijack the tab-swipe gesture.
    -->
    <div v-if="activeChips.length" class="flex flex-wrap items-center gap-1.5 px-3 pb-2">
      <button
        v-for="chip in activeChips"
        :key="chip.key"
        class="badge badge-primary badge-sm gap-1"
        @click="chip.clear()"
      >
        {{ chip.label }}
        <XMarkIcon class="h-3 w-3" />
      </button>
      <button class="btn btn-ghost btn-xs text-error" @click="resetFilters">Zurücksetzen</button>
    </div>

    <div
      v-if="hasActiveFilters"
      class="flex justify-between items-baseline px-3 pb-2 text-xs text-base-content/70"
    >
      <span>{{ resultCount }} Treffer</span>
      <span class="flex gap-2 font-semibold">
        <span v-if="sumExpenses" class="text-base-content">{{ formatCurrency(sumExpenses) }}</span>
        <span v-if="sumPayments" class="text-success">→ {{ formatCurrency(sumPayments) }}</span>
      </span>
    </div>
  </div>
</template>
