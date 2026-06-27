<script setup lang="ts">
import { useShoppingLists } from '../../composables/useShoppingLists';
import { Cog6ToothIcon } from '@heroicons/vue/24/outline';

defineEmits<{ (e: 'manage'): void }>();

const { lists, activeListId, setActiveList } = useShoppingLists();
</script>

<template>
  <div class="flex items-center gap-2 mb-4">
    <div class="flex-1 flex items-center gap-2 overflow-x-auto pb-1 -mb-1">
      <button
        v-for="list in lists"
        :key="list.id"
        class="btn btn-sm shrink-0 gap-1"
        :class="list.id === activeListId ? 'btn-primary' : 'btn-ghost bg-base-100'"
        @click="setActiveList(list.id)"
      >
        <span v-if="list.icon">{{ list.icon }}</span>
        {{ list.name }}
      </button>
    </div>

    <button class="btn btn-sm btn-ghost btn-circle shrink-0" title="Listen verwalten" @click="$emit('manage')">
      <Cog6ToothIcon class="h-5 w-5" />
    </button>
  </div>
</template>
