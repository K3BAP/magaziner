<script setup lang="ts">
import { useFinance } from '../../composables/useFinance';
import {
  useExpenseFilter,
  NO_CATEGORY,
  type TypeFilter,
  type PersonRole,
  type SortKey,
} from '../../composables/useExpenseFilter';
import BottomSheet from '../ui/BottomSheet.vue';

const emit = defineEmits<{ (e: 'close'): void }>();

const { categories, members } = useFinance();
const {
  typeFilter,
  personRole,
  dateFrom,
  dateTo,
  datePreset,
  amountMinInput,
  amountMaxInput,
  sortKey,
  sortDir,
  activeCategoryIds,
  activeMemberIds,
  resultCount,
  applyPreset,
  markCustomRange,
  toggleCategory,
  toggleMember,
  resetFilters,
} = useExpenseFilter();

const TYPES: { value: TypeFilter; label: string }[] = [
  { value: 'all', label: 'Alle' },
  { value: 'expense', label: 'Ausgaben' },
  { value: 'payment', label: 'Zahlungen' },
];
const ROLES: { value: PersonRole; label: string }[] = [
  { value: 'any', label: 'Egal' },
  { value: 'payer', label: 'Zahler' },
  { value: 'participant', label: 'Beteiligt' },
];
const SORTS: { value: SortKey; label: string }[] = [
  { value: 'date', label: 'Datum' },
  { value: 'amount', label: 'Betrag' },
  { value: 'title', label: 'Titel' },
];
</script>

<template>
  <BottomSheet :open="true" title="Filter" @close="emit('close')">
        <!-- Typ -->
        <div class="mb-4">
          <div class="text-xs font-semibold text-base-content/70 mb-1.5">Typ</div>
          <div class="join w-full">
            <button
              v-for="t in TYPES"
              :key="t.value"
              class="btn btn-sm join-item flex-1"
              :class="typeFilter === t.value ? 'btn-primary' : 'btn-outline border-base-300'"
              @click="typeFilter = t.value"
            >
              {{ t.label }}
            </button>
          </div>
        </div>

        <!-- Kategorien -->
        <div class="mb-4" :class="{ 'opacity-40 pointer-events-none': typeFilter === 'payment' }">
          <div class="text-xs font-semibold text-base-content/70 mb-1.5">Kategorien</div>
          <div class="flex flex-wrap gap-2">
            <button
              class="badge badge-lg py-3"
              :class="activeCategoryIds.has(NO_CATEGORY) ? 'badge-primary' : 'badge-ghost'"
              @click="toggleCategory(NO_CATEGORY)"
            >
              Ohne Kategorie
            </button>
            <button
              v-for="c in categories"
              :key="c.id"
              class="badge badge-lg py-3 gap-1"
              :class="activeCategoryIds.has(c.id) ? 'badge-primary' : 'badge-ghost'"
              @click="toggleCategory(c.id)"
            >
              {{ c.icon }} {{ c.name }}
            </button>
          </div>
          <p v-if="typeFilter === 'payment'" class="text-[11px] text-base-content/60 mt-1">
            Zahlungen haben keine Kategorie.
          </p>
        </div>

        <!-- Personen -->
        <div class="mb-4">
          <div class="flex items-center justify-between">
            <div class="text-xs font-semibold text-base-content/70">Personen</div>
            <div class="join">
              <button
                v-for="r in ROLES"
                :key="r.value"
                class="btn btn-xs join-item"
                :class="personRole === r.value ? 'btn-primary' : 'btn-outline border-base-300'"
                @click="personRole = r.value"
              >
                {{ r.label }}
              </button>
            </div>
          </div>
          <div class="flex flex-wrap gap-2 mt-1">
            <button
              v-for="m in members"
              :key="m.id"
              class="badge badge-lg py-3"
              :class="activeMemberIds.has(m.id) ? 'badge-primary' : 'badge-ghost'"
              @click="toggleMember(m.id)"
            >
              {{ m.name }}
            </button>
          </div>
          <p class="text-[11px] text-base-content/60 mt-1">
            Mehrere Personen: Treffer, sobald eine davon passt.
          </p>
        </div>

        <!-- Zeitraum -->
        <div class="mb-4">
          <div class="text-xs font-semibold text-base-content/70 mb-1.5">Zeitraum</div>
          <div class="flex flex-wrap gap-2 mb-2">
            <button
              class="btn btn-xs"
              :class="datePreset === 'thisMonth' ? 'btn-primary' : 'btn-outline border-base-300'"
              @click="applyPreset('thisMonth')"
            >
              Dieser Monat
            </button>
            <button
              class="btn btn-xs"
              :class="datePreset === 'lastMonth' ? 'btn-primary' : 'btn-outline border-base-300'"
              @click="applyPreset('lastMonth')"
            >
              Letzter Monat
            </button>
            <button
              class="btn btn-xs"
              :class="datePreset === 'thisYear' ? 'btn-primary' : 'btn-outline border-base-300'"
              @click="applyPreset('thisYear')"
            >
              Dieses Jahr
            </button>
            <button
              v-if="dateFrom || dateTo"
              class="btn btn-xs btn-ghost text-error"
              @click="applyPreset('none')"
            >
              Zeitraum leeren
            </button>
          </div>
          <div class="flex gap-2">
            <label class="flex-1 flex flex-col gap-1">
              <span class="text-xs text-base-content/60">Von</span>
              <input
                v-model="dateFrom"
                type="date"
                class="input input-sm w-full"
                @change="markCustomRange"
              />
            </label>
            <label class="flex-1 flex flex-col gap-1">
              <span class="text-xs text-base-content/60">Bis</span>
              <input
                v-model="dateTo"
                type="date"
                class="input input-sm w-full"
                @change="markCustomRange"
              />
            </label>
          </div>
        </div>

        <!-- Betrag -->
        <div class="mb-4">
          <div class="text-xs font-semibold text-base-content/70 mb-1.5">Betrag (€)</div>
          <div class="flex gap-2 items-center">
            <input
              v-model="amountMinInput"
              type="text"
              inputmode="decimal"
              placeholder="min"
              class="input input-sm flex-1"
            />
            <span class="text-base-content/50">–</span>
            <input
              v-model="amountMaxInput"
              type="text"
              inputmode="decimal"
              placeholder="max"
              class="input input-sm flex-1"
            />
          </div>
        </div>

        <!-- Sortierung -->
        <div class="mb-2">
          <div class="text-xs font-semibold text-base-content/70 mb-1.5">Sortierung</div>
          <div class="flex gap-2">
            <div class="join flex-1">
              <button
                v-for="s in SORTS"
                :key="s.value"
                class="btn btn-sm join-item flex-1"
                :class="sortKey === s.value ? 'btn-primary' : 'btn-outline border-base-300'"
                @click="sortKey = s.value"
              >
                {{ s.label }}
              </button>
            </div>
            <button
              class="btn btn-sm btn-square btn-outline border-base-300"
              :title="sortDir === 'asc' ? 'Aufsteigend' : 'Absteigend'"
              @click="sortDir = sortDir === 'asc' ? 'desc' : 'asc'"
            >
              {{ sortDir === 'asc' ? '↑' : '↓' }}
            </button>
          </div>
        </div>

    <template #footer>
      <button class="btn btn-ghost text-error mr-auto" @click="resetFilters">Zurücksetzen</button>
      <button class="btn btn-primary" @click="emit('close')">
        Fertig · {{ resultCount }} Treffer
      </button>
    </template>
  </BottomSheet>
</template>
