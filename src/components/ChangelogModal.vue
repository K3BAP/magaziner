<script setup lang="ts">
import { useChangelog } from '../composables/useChangelog';
import { SparklesIcon, CheckIcon } from '@heroicons/vue/24/outline';

const { unseenEntries, hasUnseen, markSeen } = useChangelog();

// Format ISO date as locale-friendly "18.05.2026"
const formatDate = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
};
</script>

<template>
  <Teleport to="body">
    <div
      v-if="hasUnseen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="changelog-title"
    >
      <div class="bg-base-100 rounded-2xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden max-h-[85vh]">
        <!-- Header -->
        <div class="flex items-center gap-3 px-5 py-4 border-b border-base-200">
          <div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <SparklesIcon class="h-5 w-5 text-primary" />
          </div>
          <div class="flex-1 min-w-0">
            <h2 id="changelog-title" class="font-bold text-base">Was ist neu?</h2>
            <p class="text-xs text-base-content/60">Das hat sich seit deinem letzten Besuch geändert.</p>
          </div>
        </div>

        <!-- Entries -->
        <div class="overflow-y-auto p-5 flex flex-col gap-5">
          <section
            v-for="entry in unseenEntries"
            :key="entry.version"
            class="flex flex-col gap-2"
          >
            <div class="flex items-center gap-2 flex-wrap">
              <span class="badge badge-primary badge-sm font-mono">v{{ entry.version }}</span>
              <span v-if="entry.title" class="font-semibold text-sm">{{ entry.title }}</span>
              <span class="text-xs text-base-content/50 ml-auto">{{ formatDate(entry.date) }}</span>
            </div>
            <ul class="flex flex-col gap-1.5 pl-1">
              <li
                v-for="(item, idx) in entry.items"
                :key="idx"
                class="text-sm flex items-start gap-2"
              >
                <span class="text-primary mt-1.5 shrink-0">•</span>
                <span>{{ item }}</span>
              </li>
            </ul>
          </section>
        </div>

        <!-- Footer -->
        <div class="flex items-center justify-end px-5 py-3 border-t border-base-200">
          <button type="button" class="btn btn-primary btn-sm gap-1" @click="markSeen">
            <CheckIcon class="h-4 w-4" />
            Verstanden
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
