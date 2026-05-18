import { ref } from 'vue';
import { supabase } from '../supabase';

export interface HouseholdInvite {
  id: string;
  household_id: string;
  token: string;
  created_by: string;
  created_at: string;
  revoked_at: string | null;
}

// Module-level cache so every household card shares the same invite state and
// updates propagate automatically. `null` means "we've checked and there is
// no active invite"; `undefined` (missing key) means "not yet fetched".
const invitesByHousehold = ref<Record<string, HouseholdInvite | null>>({});
const loadingByHousehold = ref<Record<string, boolean>>({});

const inviteUrlFor = (token: string): string => {
  // Build an absolute URL so it can be copied/shared without context.
  if (typeof window === 'undefined') return `/join/${token}`;
  return `${window.location.origin}/join/${token}`;
};

export function useInvites() {
  const fetchActiveInvite = async (householdId: string): Promise<HouseholdInvite | null> => {
    loadingByHousehold.value = { ...loadingByHousehold.value, [householdId]: true };
    try {
      const { data, error } = await supabase
        .from('household_invites')
        .select('*')
        .eq('household_id', householdId)
        .is('revoked_at', null)
        .maybeSingle();

      if (error) {
        console.error('Fehler beim Laden der Einladung:', error);
        invitesByHousehold.value = { ...invitesByHousehold.value, [householdId]: null };
        return null;
      }

      invitesByHousehold.value = { ...invitesByHousehold.value, [householdId]: data ?? null };
      return data ?? null;
    } finally {
      loadingByHousehold.value = { ...loadingByHousehold.value, [householdId]: false };
    }
  };

  /**
   * Generate (or regenerate) the household's invite link. Server-side, this
   * revokes any previously active invite — only one link is valid at a time.
   */
  const createInvite = async (householdId: string): Promise<HouseholdInvite> => {
    const { data, error } = await supabase.rpc('create_household_invite', { hid: householdId });
    if (error) {
      console.error('Fehler beim Erstellen der Einladung:', error);
      throw error;
    }
    const invite = data as HouseholdInvite;
    invitesByHousehold.value = { ...invitesByHousehold.value, [householdId]: invite };
    return invite;
  };

  const revokeInvite = async (invite: HouseholdInvite): Promise<void> => {
    const { error } = await supabase
      .from('household_invites')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', invite.id);

    if (error) {
      console.error('Fehler beim Widerrufen der Einladung:', error);
      throw error;
    }
    invitesByHousehold.value = { ...invitesByHousehold.value, [invite.household_id]: null };
  };

  /**
   * Redeem an invite token. Returns the household_id the caller joined.
   * Throws a translated Error for the two known failure modes so the view
   * can render a friendly message without parsing SQLSTATE.
   */
  const acceptInvite = async (token: string): Promise<string> => {
    const { data, error } = await supabase.rpc('accept_household_invite', {
      invite_token: token,
    });
    if (error) {
      // Map known SQLSTATEs to user copy; surface everything else verbatim.
      if (error.code === '28000') throw new Error('Bitte zuerst anmelden.');
      if (error.code === 'P0002') throw new Error('Einladung ist ungültig oder wurde widerrufen.');
      throw error;
    }
    return data as string;
  };

  return {
    invitesByHousehold,
    loadingByHousehold,
    fetchActiveInvite,
    createInvite,
    revokeInvite,
    acceptInvite,
    inviteUrlFor,
  };
}
