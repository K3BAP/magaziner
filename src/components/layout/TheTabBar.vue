<script setup lang="ts">
import { computed, ref, watch, onMounted, onBeforeUnmount } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  HomeIcon,
  CheckCircleIcon,
  ShoppingCartIcon,
  BanknotesIcon,
  Squares2X2Icon,
} from '@heroicons/vue/24/outline';
import {
  HomeIcon as HomeSolid,
  CheckCircleIcon as CheckSolid,
  ShoppingCartIcon as CartSolid,
  BanknotesIcon as BanknotesSolid,
  Squares2X2Icon as SquaresSolid,
} from '@heroicons/vue/24/solid';
import { useShoppingList } from '../../composables/useShoppingList';
import { useChores } from '../../composables/useChores';
import MoreSheet from './MoreSheet.vue';
import { keyboardOpen } from '../../composables/useKeyboardInset';

const route = useRoute();
const router = useRouter();
const { items: shoppingItems } = useShoppingList();
const { dueForMe } = useChores();

const showMore = ref(false);

const openShopping = computed(() => shoppingItems.value.filter((i) => !i.is_completed).length);

const tabs = computed(() => [
  { key: 'dashboard', label: 'Übersicht', to: 'dashboard', icon: HomeIcon, active: HomeSolid, badge: 0 },
  { key: 'tasks', label: 'Aufgaben', to: 'todos', icon: CheckCircleIcon, active: CheckSolid, badge: dueForMe.value.length },
  { key: 'shopping', label: 'Einkauf', to: 'shoppingList', icon: ShoppingCartIcon, active: CartSolid, badge: openShopping.value },
  { key: 'finance', label: 'Finanzen', to: 'finance', icon: BanknotesIcon, active: BanknotesSolid, badge: 0 },
]);

const current = computed(() => (showMore.value ? 'more' : route.meta.tab));

const go = (name: string) => {
  showMore.value = false;
  if (route.name === name) window.scrollTo({ top: 0, behavior: 'smooth' });
  else router.push({ name });
};

// Publish our height so FABs, toasts and page padding can sit above us.
const bar = ref<HTMLElement | null>(null);
let ro: ResizeObserver | null = null;
onMounted(() => {
  const set = () =>
    document.documentElement.style.setProperty(
      '--tabbar-h',
      `${keyboardOpen.value ? 0 : bar.value?.offsetHeight ?? 0}px`,
    );
  watch(keyboardOpen, set);
  ro = new ResizeObserver(set);
  if (bar.value) ro.observe(bar.value);
  set();
});
onBeforeUnmount(() => {
  ro?.disconnect();
  document.documentElement.style.setProperty('--tabbar-h', '0px');
});
</script>

<template>
  <nav
    v-show="!keyboardOpen"
    ref="bar"
    class="tabbar fixed bottom-0 inset-x-0 z-40 bg-base-100/90 backdrop-blur-xl border-t border-base-content/10"
    aria-label="Hauptnavigation"
  >
    <div class="mx-auto max-w-2xl grid grid-cols-5 px-1">
      <button
        v-for="t in tabs"
        :key="t.key"
        type="button"
        class="tab-btn"
        :class="{ 'is-active': current === t.key }"
        :aria-current="current === t.key ? 'page' : undefined"
        @click="go(t.to)"
      >
        <span class="relative">
          <component :is="current === t.key ? t.active : t.icon" class="h-6 w-6" />
          <span v-if="t.badge > 0" class="badge-dot">{{ t.badge > 99 ? '99+' : t.badge }}</span>
        </span>
        <span class="text-[11px] font-semibold">{{ t.label }}</span>
      </button>
      <button
        type="button"
        class="tab-btn"
        :class="{ 'is-active': current === 'more' }"
        @click="showMore = !showMore"
      >
        <span class="relative">
          <component :is="current === 'more' ? SquaresSolid : Squares2X2Icon" class="h-6 w-6" />
        </span>
        <span class="text-[11px] font-semibold">Mehr</span>
      </button>
    </div>
  </nav>

  <MoreSheet v-model:open="showMore" />
</template>

<style scoped>
.tabbar {
  padding-bottom: env(safe-area-inset-bottom);
}
.tab-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  height: 3.5rem;
  color: color-mix(in oklab, var(--color-base-content) 55%, transparent);
  -webkit-tap-highlight-color: transparent;
  transition: color 0.15s ease;
}
.tab-btn:active {
  transform: scale(0.94);
}
.tab-btn.is-active {
  color: var(--color-primary);
}
.badge-dot {
  position: absolute;
  top: -4px;
  right: -10px;
  min-width: 1.1rem;
  height: 1.1rem;
  padding: 0 4px;
  border-radius: 999px;
  background: var(--color-accent);
  color: var(--color-accent-content);
  font-size: 10px;
  font-weight: 700;
  line-height: 1.1rem;
  text-align: center;
}
</style>
