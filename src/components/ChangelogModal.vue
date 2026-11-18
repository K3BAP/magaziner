<script setup lang="ts">
/**
 * „Was ist neu?“. Shows unseen releases automatically; from the settings it
 * can be opened by hand. A release with `highlights` (2.0) starts with a short
 * page-by-page tour before the full list.
 */
import { ref, computed, watch } from 'vue';
import { useChangelog } from '../composables/useChangelog';
import BottomSheet from './ui/BottomSheet.vue';
import BrandMark from './ui/BrandMark.vue';
import { parseLocalDate } from '../utils/date';

const { isOpen, visibleEntries, hasUnseen, markSeen } = useChangelog();

const tour = computed(() => (hasUnseen.value ? visibleEntries.value[0]?.highlights ?? [] : []));
const page = ref(0);
const inTour = computed(() => page.value < tour.value.length);

watch(isOpen, (o) => {
  if (o) page.value = 0;
});

const formatDate = (iso: string) =>
  parseLocalDate(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
</script>

<template>
  <BottomSheet :open="isOpen" size="md" hide-close @close="markSeen">
    <!-- Feature tour -->
    <div v-if="inTour" class="flex flex-col items-center text-center gap-4 pt-2 pb-2 min-h-72">
      <BrandMark v-if="page === 0" :size="56" />
      <div v-else class="text-5xl" aria-hidden="true">{{ tour[page].icon }}</div>
      <h3 class="font-display text-2xl">{{ tour[page].title }}</h3>
      <p class="text-base-content/70 max-w-sm">{{ tour[page].text }}</p>
      <div class="flex gap-1.5 mt-auto pt-4" aria-hidden="true">
        <span
          v-for="(_, i) in tour"
          :key="i"
          class="h-1.5 rounded-full transition-all"
          :class="i === page ? 'w-6 bg-primary' : 'w-1.5 bg-base-content/20'"
        />
      </div>
    </div>

    <!-- Release notes -->
    <div v-else class="flex flex-col gap-5">
      <div>
        <h3 class="font-display text-xl">Was ist neu?</h3>
        <p class="text-sm text-base-content/60">
          {{ hasUnseen ? 'Das hat sich seit deinem letzten Besuch geändert.' : 'Die letzten Versionen im Überblick.' }}
        </p>
      </div>
      <section v-for="entry in visibleEntries" :key="entry.version" class="flex flex-col gap-2">
        <div class="flex items-center gap-2 flex-wrap">
          <span class="badge badge-primary badge-sm font-mono">v{{ entry.version }}</span>
          <span v-if="entry.title" class="font-semibold text-sm">{{ entry.title }}</span>
          <span class="text-xs text-base-content/50 ml-auto">{{ formatDate(entry.date) }}</span>
        </div>
        <ul class="flex flex-col gap-1.5 pl-1">
          <li v-for="(item, idx) in entry.items" :key="idx" class="text-sm flex items-start gap-2">
            <span class="text-primary mt-1.5 shrink-0">•</span>
            <span>{{ item }}</span>
          </li>
        </ul>
      </section>
    </div>

    <template #footer>
      <template v-if="inTour">
        <button type="button" class="btn btn-ghost mr-auto" @click="page = tour.length">Überspringen</button>
        <button type="button" class="btn btn-primary min-w-28" @click="page++">
          {{ page === tour.length - 1 ? 'Alle Details' : 'Weiter' }}
        </button>
      </template>
      <button v-else type="button" class="btn btn-primary min-w-28" @click="markSeen">Los geht's</button>
    </template>
  </BottomSheet>
</template>
