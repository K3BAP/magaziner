<script setup lang="ts">
import { useShoppingLists } from '../../composables/useShoppingLists';

const { lists, activeListId, setActiveList } = useShoppingLists();
</script>

<template>
  <div v-if="lists.length > 1" class="-mx-4 px-4 flex items-center gap-2 overflow-x-auto pb-1 mb-3 no-scrollbar">
    <button
      v-for="list in lists"
      :key="list.id"
      type="button"
      class="btn btn-sm rounded-full shrink-0 gap-1.5 border-0"
      :class="list.id === activeListId ? 'btn-primary' : 'bg-base-100 text-base-content/70'"
      @click="setActiveList(list.id)"
    >
      <span v-if="list.icon">{{ list.icon }}</span>
      {{ list.name }}
    </button>
  </div>
</template>

<style scoped>
.no-scrollbar {
  scrollbar-width: none;
}
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
</style>
