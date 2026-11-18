import { ref, computed, watch } from 'vue';

/**
 * Light / dark / system appearance. The *mode* is the user's choice, the
 * *theme* is what's applied (system resolves via prefers-color-scheme and
 * follows OS changes live). Also keeps `<meta name="theme-color">` in sync so
 * the PWA status bar matches.
 */

export type ThemeMode = 'light' | 'dark' | 'system';
export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'theme_mode_v2';
const LEGACY_KEY = 'theme_v1';

const THEME_NAME: Record<Theme, string> = { light: 'magaziner', dark: 'magaziner-dark' };

const readMode = (): ThemeMode => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark' || saved === 'system') return saved;
    // 0.x stored an explicit light/dark choice — keep honouring it.
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy === 'light' || legacy === 'dark') return legacy;
  } catch {
    /* private mode */
  }
  return 'system';
};

const media = typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)') : null;
const systemDark = ref(media?.matches ?? false);
media?.addEventListener('change', (e) => (systemDark.value = e.matches));

const mode = ref<ThemeMode>(readMode());
const theme = computed<Theme>(() =>
  mode.value === 'system' ? (systemDark.value ? 'dark' : 'light') : mode.value,
);

const apply = (t: Theme) => {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', THEME_NAME[t]);
  // Match the status bar to the navbar surface.
  requestAnimationFrame(() => {
    const bg = getComputedStyle(document.body).backgroundColor;
    let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'theme-color';
      document.head.appendChild(meta);
    }
    meta.content = bg || (t === 'dark' ? '#1c1f1e' : '#f7f6f2');
  });
};

apply(theme.value);
watch(theme, apply);
watch(mode, (m) => {
  try {
    localStorage.setItem(STORAGE_KEY, m);
  } catch {
    /* ignore */
  }
});

export function useTheme() {
  const setMode = (m: ThemeMode) => (mode.value = m);
  const toggle = () => (mode.value = theme.value === 'dark' ? 'light' : 'dark');
  return { mode, theme, setMode, toggle };
}
