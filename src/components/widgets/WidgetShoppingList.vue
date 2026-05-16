<script setup lang="ts">
import { onMounted, computed } from 'vue';
import { useShoppingList } from '../../composables/useShoppingList';
import { ShoppingCartIcon } from '@heroicons/vue/24/outline';
import WidgetShell from './WidgetShell.vue';

const { items, fetchItems, loading } = useShoppingList();

onMounted(() => {
  fetchItems();
});

const itemCount = computed(() => items.value.filter(i => !i.is_completed).length);
</script>

<template>
  <WidgetShell
    title="Einkaufsliste"
    :icon="ShoppingCartIcon"
    tone="accent"
    :clickable="true"
    :loading="loading"
    align="center"
  >
    <div class="flex-1 flex flex-col items-center justify-center w-full">
      <div class="text-5xl font-bold tabular-nums text-accent leading-none">{{ itemCount }}</div>
      <div class="text-xs text-base-content/50 mt-2">offen</div>
    </div>
  </WidgetShell>
</template>
