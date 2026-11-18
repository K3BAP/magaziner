<script setup lang="ts">
import { computed } from 'vue';
import { type ShoppingItem, useShoppingList } from '../composables/useShoppingList';
import SwipeRow from './ui/SwipeRow.vue';
import { CheckIcon } from '@heroicons/vue/24/outline';

const props = defineProps<{ item: ShoppingItem }>();
const emit = defineEmits<{ (e: 'edit', item: ShoppingItem): void }>();
const { toggleItem, deleteItem, offerFor } = useShoppingList();

// A leading offer date ("Fr. 21.08. Kesselchips") is rendered on its own: red
// once the offer is running, and until then the whole row is greyed out.
const offer = computed(() => offerFor(props.item));
const pending = computed(() => props.item.id.startsWith('temp-'));

const onToggle = () => {
  navigator.vibrate?.(8);
  toggleItem(props.item);
};
</script>

<template>
  <SwipeRow label="Entfernen" :disabled="pending" @swipe="deleteItem(item)">
    <div class="flex items-center gap-3 pl-3 pr-4 min-h-14" :class="pending ? 'opacity-60' : ''">
      <button
        type="button"
        class="check h-11 w-11 -my-1 shrink-0 flex items-center justify-center"
        :aria-label="item.is_completed ? 'Als offen markieren' : 'Abhaken'"
        :aria-pressed="item.is_completed"
        @click="onToggle"
      >
        <span
          class="h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all"
          :class="item.is_completed ? 'bg-primary border-primary text-primary-content scale-95' : 'border-base-content/30'"
        >
          <CheckIcon v-if="item.is_completed" class="h-4 w-4 stroke-[3]" />
        </span>
      </button>

      <button type="button" class="flex-1 min-w-0 text-left py-2.5" @click="emit('edit', item)">
        <span
          class="block text-[17px] leading-snug truncate transition-colors"
          :class="item.is_completed
            ? 'line-through text-base-content/40'
            : (offer?.isFuture ? 'text-base-content/45' : '')"
        >
          <template v-if="offer"><span :class="!item.is_completed && !offer.isFuture ? 'text-error font-semibold' : ''">{{ offer.label }}</span> {{ offer.rest }}</template>
          <template v-else>{{ item.title }}</template>
        </span>
        <span v-if="item.note" class="block text-xs text-base-content/55 truncate mt-0.5">{{ item.note }}</span>
      </button>
    </div>
  </SwipeRow>
</template>
