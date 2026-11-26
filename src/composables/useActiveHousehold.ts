import { computed } from 'vue';
import { useProfile } from './useProfile';
import { useHouseholds } from './useHouseholds';

/**
 * Thin selector that exposes the user's currently active household.
 * Single source of truth for "where am I right now."
 */
export function useActiveHousehold() {
  const { profile } = useProfile();
  const { households } = useHouseholds();

  const activeHouseholdId = computed(() => profile.value?.active_household_id ?? null);

  const activeHousehold = computed(() => {
    if (!activeHouseholdId.value) return null;
    return households.value.find(h => h.id === activeHouseholdId.value) ?? null;
  });

  return {
    activeHouseholdId,
    activeHousehold,
  };
}

/**
 * Snapshot the active household before an async fetch and check afterwards
 * whether it is still the same. Responses that arrive after a household switch
 * must be dropped, or they would overwrite the new household's data.
 *
 *   const isCurrent = householdSnapshot();
 *   const { data } = await supabase.from('chores').select();
 *   if (!isCurrent()) return;
 */
export function householdSnapshot(): () => boolean {
  const { activeHouseholdId } = useActiveHousehold();
  const hid = activeHouseholdId.value;
  return () => activeHouseholdId.value === hid;
}
