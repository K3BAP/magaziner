<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { SignalSlashIcon } from '@heroicons/vue/24/outline';

const online = ref(typeof navigator === 'undefined' ? true : navigator.onLine);
const update = () => (online.value = navigator.onLine);
onMounted(() => {
  window.addEventListener('online', update);
  window.addEventListener('offline', update);
});
onBeforeUnmount(() => {
  window.removeEventListener('online', update);
  window.removeEventListener('offline', update);
});
</script>

<template>
  <Transition name="page">
    <div
      v-if="!online"
      class="mx-auto max-w-2xl w-full px-4 pt-2"
      role="status"
    >
      <div class="flex items-center gap-2 rounded-2xl bg-warning/15 text-warning-content dark:text-warning px-4 py-2 text-sm">
        <SignalSlashIcon class="h-5 w-5 shrink-0" />
        <span>Du bist offline. Änderungen werden erst gespeichert, wenn du wieder verbunden bist.</span>
      </div>
    </div>
  </Transition>
</template>
