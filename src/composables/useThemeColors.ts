import { ref, onMounted, onBeforeUnmount } from 'vue';

/**
 * Reactive reader for DaisyUI theme CSS variables.
 * Returns a `read(name, fallback)` function whose reactive output flips when
 * the document's `data-theme` attribute changes — useful for Chart.js options
 * that don't otherwise see CSS variable changes.
 */
export function useThemeColors() {
  const bump = ref(0);
  let observer: MutationObserver | null = null;

  onMounted(() => {
    observer = new MutationObserver(() => bump.value++);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  });

  onBeforeUnmount(() => {
    observer?.disconnect();
  });

  const read = (name: string, fallback: string) => {
    // Touch bump so callers inside a computed re-evaluate on theme change.
    void bump.value;
    if (typeof window === 'undefined') return fallback;
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  };

  return { read };
}
