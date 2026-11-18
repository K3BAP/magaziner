<script setup lang="ts">
import { computed } from 'vue';
import BottomSheet from './BottomSheet.vue';
import { useConfirm } from '../../composables/useConfirm';
import { ExclamationTriangleIcon } from '@heroicons/vue/24/outline';

const { pending, answer } = useConfirm();
const open = computed(() => pending.value !== null);
</script>

<template>
  <BottomSheet :open="open" size="sm" hide-close @close="answer(false)">
    <div v-if="pending" class="flex flex-col items-center text-center gap-3 pt-2">
      <div
        v-if="pending.danger"
        class="h-12 w-12 rounded-full bg-error/10 text-error flex items-center justify-center"
      >
        <ExclamationTriangleIcon class="h-6 w-6" />
      </div>
      <h3 class="font-display font-bold text-lg">{{ pending.title }}</h3>
      <p v-if="pending.message" class="text-sm text-base-content/70 whitespace-pre-line">
        {{ pending.message }}
      </p>
    </div>
    <template #footer>
      <div v-if="pending" class="grid grid-cols-2 gap-2 w-full">
        <button type="button" class="btn btn-ghost" @click="answer(false)">
          {{ pending.cancelLabel ?? 'Abbrechen' }}
        </button>
        <button
          type="button"
          class="btn"
          :class="pending.danger ? 'btn-error' : 'btn-primary'"
          @click="answer(true)"
        >
          {{ pending.confirmLabel ?? 'OK' }}
        </button>
      </div>
    </template>
  </BottomSheet>
</template>
