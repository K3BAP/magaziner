import { ref } from 'vue';
import { supabase } from '../supabase';

export interface HouseholdMember {
  user_id: string;
  role: 'owner' | 'member';
  joined_at: string;
  display_name: string;
  avatar_url: string | null;
}

// Per-household members cache. Loaded lazily when the member list is expanded
// in the settings UI. Refreshed after a kick / invite-accept so the badge
// counts stay in sync.
const membersByHousehold = ref<Record<string, HouseholdMember[]>>({});
const loadingByHousehold = ref<Record<string, boolean>>({});

export function useHouseholdMembers() {
  const fetchMembers = async (householdId: string): Promise<HouseholdMember[]> => {
    loadingByHousehold.value = { ...loadingByHousehold.value, [householdId]: true };
    try {
      const { data, error } = await supabase
        .from('household_members')
        .select('user_id, role, joined_at, user_profiles(display_name, avatar_url)')
        .eq('household_id', householdId)
        .order('joined_at', { ascending: true });

      if (error) {
        console.error('Fehler beim Laden der Mitglieder:', error);
        membersByHousehold.value = { ...membersByHousehold.value, [householdId]: [] };
        return [];
      }

      const rows = (data ?? []).map((r: any) => ({
        user_id: r.user_id,
        role: r.role,
        joined_at: r.joined_at,
        display_name: r.user_profiles?.display_name ?? 'Unbekannt',
        avatar_url: r.user_profiles?.avatar_url ?? null,
      })) as HouseholdMember[];

      membersByHousehold.value = { ...membersByHousehold.value, [householdId]: rows };
      return rows;
    } finally {
      loadingByHousehold.value = { ...loadingByHousehold.value, [householdId]: false };
    }
  };

  /**
   * Owner-only: kick a member. RLS enforces "only owner can delete a row
   * belonging to a household they own" — and the prevent-owner-self-removal
   * trigger blocks attempts to remove the owner row itself.
   */
  const removeMember = async (householdId: string, userId: string): Promise<void> => {
    const prev = membersByHousehold.value[householdId] ?? [];
    membersByHousehold.value = {
      ...membersByHousehold.value,
      [householdId]: prev.filter(m => m.user_id !== userId),
    };

    const { error } = await supabase
      .from('household_members')
      .delete()
      .eq('household_id', householdId)
      .eq('user_id', userId);

    if (error) {
      console.error('Fehler beim Entfernen des Mitglieds:', error);
      // Rollback optimistic removal.
      membersByHousehold.value = { ...membersByHousehold.value, [householdId]: prev };
      throw error;
    }
  };

  return {
    membersByHousehold,
    loadingByHousehold,
    fetchMembers,
    removeMember,
  };
}
