<script setup lang="ts">
import { ref, computed } from 'vue';
import { type ShoppingItem, useShoppingList } from '../composables/useShoppingList';
import { useShoppingCategories } from '../composables/useShoppingCategories';
import { TagIcon, XMarkIcon } from '@heroicons/vue/24/outline';

const props = defineProps<{ item: ShoppingItem }>();
const { toggleItem, setItemCategory, offerFor } = useShoppingList();
const { categories } = useShoppingCategories();

// Bottom-sheet picker instead of a CSS dropdown: a fixed-position modal isn't
// clipped by the group card's `overflow-hidden`, and it's easier to tap.
const showPicker = ref(false);

const currentCategory = computed(
  () => categories.value.find((c) => c.id === props.item.category_id) ?? null,
);

// A leading offer date ("Fr. 21.08. Kesselchips") is rendered on its own: red
// once the offer is running, and until then the whole row is greyed out.
const offer = computed(() => offerFor(props.item));

const pick = (categoryId: string) => {
  setItemCategory(props.item, categoryId);
  showPicker.value = false;
};
</script>

<template>
  <div class="flex items-center justify-between p-4 border-b border-base-200 last:border-0 hover:bg-base-200/30 transition-colors group">

    <div class="flex items-center gap-3 min-w-0">
      <input
        type="checkbox"
        :checked="item.is_completed"
        @change="toggleItem(item)"
        class="checkbox checkbox-primary checkbox-sm"
      />

      <span
        class="font-medium text-lg transition-all truncate"
        :class="item.is_completed
          ? 'line-through text-gray-400'
          : (offer?.isFuture ? 'text-base-content/40' : '')"
      >
        <template v-if="offer"><span :class="!item.is_completed && !offer.isFuture ? 'text-error font-semibold' : ''">{{ offer.label }}</span> {{ offer.rest }}</template>
        <template v-else>{{ item.title }}</template>
      </span>
    </div>

    <div class="flex items-center gap-1 shrink-0">
      <!-- Kategorie ändern -->
      <button
        class="btn btn-ghost btn-sm btn-circle opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity"
        title="Kategorie ändern"
        @click="showPicker = true"
      >
        <TagIcon class="h-5 w-5" />
      </button>
    </div>

    <!-- Kategorie-Auswahl als Bottom-Sheet (position: fixed -> nicht vom Card-Overflow abgeschnitten) -->
    <div v-if="showPicker" class="modal modal-open modal-bottom sm:modal-middle" @click.self="showPicker = false">
      <div class="modal-box">
        <div class="flex items-center justify-between mb-1">
          <h3 class="font-bold text-lg">Kategorie wählen</h3>
          <button class="btn btn-sm btn-ghost btn-circle" @click="showPicker = false"><XMarkIcon class="h-5 w-5" /></button>
        </div>
        <p class="text-sm text-base-content/60 truncate mb-3">{{ item.title }}</p>

        <ul class="menu p-0 w-full">
          <li v-for="cat in categories" :key="cat.id">
            <a :class="{ 'active': cat.id === currentCategory?.id }" @click="pick(cat.id)">
              <span class="text-base">{{ cat.icon }}</span> {{ cat.name }}
            </a>
          </li>
        </ul>
      </div>
    </div>

  </div>
</template>
