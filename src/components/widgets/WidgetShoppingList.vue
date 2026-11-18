<script setup lang="ts">
import { computed } from 'vue';
import { useShoppingList } from '../../composables/useShoppingList';
import { useShoppingLists } from '../../composables/useShoppingLists';
import { ShoppingCartIcon } from '@heroicons/vue/24/outline';
import WidgetShell from './WidgetShell.vue';

const { items, loading } = useShoppingList();
const { activeList } = useShoppingLists();

const open = computed(() => items.value.filter((i) => !i.is_completed));
const preview = computed(() => open.value.slice(0, 2));
</script>

<template>
  <WidgetShell :title="activeList?.name ?? 'Einkaufsliste'" :icon="ShoppingCartIcon" tone="accent" clickable :loading="loading && items.length === 0">
    <template v-if="open.length > 0">
      <div class="flex items-baseline gap-1.5">
        <span class="font-display text-4xl tabular-nums leading-none text-accent">{{ open.length }}</span>
        <span class="text-xs text-base-content/55">offen</span>
      </div>
      <ul class="mt-3 flex flex-col gap-1">
        <li v-for="i in preview" :key="i.id" class="text-sm truncate flex items-center gap-1.5">
          <span class="h-1.5 w-1.5 rounded-full bg-accent/50 shrink-0" />
          <span class="truncate">{{ i.title }}</span>
        </li>
      </ul>
    </template>
    <div v-else class="mt-auto text-sm text-base-content/50">Nichts zu kaufen</div>
  </WidgetShell>
</template>
