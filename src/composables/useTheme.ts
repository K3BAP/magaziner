import { ref, watch } from 'vue';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'theme_v1';

const getInitialTheme = (): Theme => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === 'light' || saved === 'dark') return saved;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

const theme = ref<Theme>(getInitialTheme());

const apply = (t: Theme) => {
  document.documentElement.setAttribute('data-theme', t);
};

apply(theme.value);

watch(theme, (t) => {
  apply(t);
  localStorage.setItem(STORAGE_KEY, t);
});

export function useTheme() {
  const toggle = () => {
    theme.value = theme.value === 'dark' ? 'light' : 'dark';
  };
  return { theme, toggle };
}
