import { ref, computed } from 'vue';
import { changelog, CURRENT_VERSION, type ChangelogEntry } from '../changelog';

const STORAGE_KEY = 'magaziner:lastSeenChangelogVersion';

/**
 * Parse a dotted version string into a numeric tuple for comparison.
 * Non-numeric segments fall back to 0 so we never throw — at worst, two
 * funky strings compare as equal and we skip the popup, which is fine.
 */
const parseVersion = (v: string): number[] =>
  v.split('.').map((s) => {
    const n = Number.parseInt(s, 10);
    return Number.isFinite(n) ? n : 0;
  });

const compareVersions = (a: string, b: string): number => {
  const aa = parseVersion(a);
  const bb = parseVersion(b);
  const len = Math.max(aa.length, bb.length);
  for (let i = 0; i < len; i++) {
    const diff = (aa[i] ?? 0) - (bb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
};

const readLastSeen = (): string | null => {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
};

// Module-level reactive state so any component reading it sees the same
// "should we show the modal" flag.
const lastSeenVersion = ref<string | null>(readLastSeen());

/**
 * Entries strictly newer than the last-seen version. On a brand-new install
 * (no key in localStorage) we return an empty array — we don't want to
 * dump the entire app history on a first-time user. The bootstrap call
 * just writes the current version so future updates trigger normally.
 */
const unseenEntries = computed<ChangelogEntry[]>(() => {
  if (lastSeenVersion.value === null) return [];
  return changelog.filter((e) => compareVersions(e.version, lastSeenVersion.value!) > 0);
});

const hasUnseen = computed(() => unseenEntries.value.length > 0);

export function useChangelog() {
  /**
   * Call once on app boot. If this is a brand-new install, silently records
   * the current version so the popup doesn't fire on first use. Otherwise
   * leaves the existing value alone so `hasUnseen` can pick up the delta.
   */
  const bootstrap = () => {
    if (lastSeenVersion.value === null) {
      try {
        localStorage.setItem(STORAGE_KEY, CURRENT_VERSION);
      } catch {
        /* ignore — quota / private mode */
      }
      lastSeenVersion.value = CURRENT_VERSION;
    }
  };

  const markSeen = () => {
    try {
      localStorage.setItem(STORAGE_KEY, CURRENT_VERSION);
    } catch {
      /* ignore */
    }
    lastSeenVersion.value = CURRENT_VERSION;
  };

  return {
    currentVersion: CURRENT_VERSION,
    lastSeenVersion,
    unseenEntries,
    hasUnseen,
    bootstrap,
    markSeen,
  };
}
