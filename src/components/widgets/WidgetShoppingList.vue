<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { supabase } from '../../supabase';
import { ShoppingCartIcon } from '@heroicons/vue/24/outline';
import WidgetShell from './WidgetShell.vue';

// Self-contained household-wide count of open entries across all lists. Kept
// independent of useShoppingList (whose state is scoped to the active list).
const itemCount = ref(0);
const loading = ref(false);

const fetchCount = async () => {
  try {
    loading.value = true;
    const { count, error } = await supabase
      .from('shopping_list')
      .select('id', { count: 'exact', head: true })
      .eq('is_completed', false);
    if (error) throw error;
    itemCount.value = count ?? 0;
  } catch (error) {
    console.error('Fehler beim Laden der Einkaufslisten-Anzahl:', error);
  } finally {
    loading.value = false;
  }
};

onMounted(fetchCount);
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
