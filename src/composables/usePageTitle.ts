import { ref, watchEffect, onBeforeUnmount } from 'vue';

/**
 * Lets a view override the header title (e.g. the location or recipe name).
 * Cleared automatically when the view unmounts.
 */
const override = ref<string | null>(null);

export function usePageTitle(source?: () => string | null | undefined) {
  if (source) {
    const stop = watchEffect(() => {
      override.value = source() ?? null;
    });
    onBeforeUnmount(() => {
      stop();
      override.value = null;
    });
  }
  return { pageTitleOverride: override };
}
