import { ref } from 'vue';
import { supabase } from '../supabase';
import { useProfile } from './useProfile';

export interface Household {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
}

export interface HouseholdMembership extends Household {
  role: 'owner' | 'member';
}

const households = ref<HouseholdMembership[]>([]);
const loading = ref(false);

export function useHouseholds() {
  const { profile, updateProfile } = useProfile();

  const fetchMyHouseholds = async () => {
    if (!profile.value) {
      households.value = [];
      return;
    }
    loading.value = true;
    try {
      // Filter to our own membership rows explicitly. RLS lets us read every
      // household_members row in households we belong to (needed for the
      // member-list UI), so without this filter co-members' rows would show
      // up here as duplicate entries with the wrong role.
      const { data, error } = await supabase
        .from('household_members')
        .select('role, households(*)')
        .eq('user_id', profile.value.id)
        .order('joined_at', { ascending: true });

      if (error) {
        console.error('Fehler beim Laden der Haushalte:', error);
        households.value = [];
        return;
      }

      households.value = (data || [])
        .filter((row: any) => row.households)
        .map((row: any) => ({ ...row.households, role: row.role }));
    } finally {
      loading.value = false;
    }
  };

  const createHousehold = async (name: string): Promise<Household | null> => {
    if (!profile.value) throw new Error('Kein Profil geladen');
    const trimmed = name.trim();
    if (!trimmed) return null;

    // Insert household (RLS WITH CHECK requires owner_id = auth.uid())
    const { data: hh, error: hhErr } = await supabase
      .from('households')
      .insert({ name: trimmed, owner_id: profile.value.id })
      .select()
      .single();

    if (hhErr || !hh) {
      console.error('Fehler beim Anlegen des Haushalts:', hhErr);
      throw hhErr;
    }

    // Insert membership row (RLS allows because we own the freshly-created household)
    const { error: memberErr } = await supabase
      .from('household_members')
      .insert({ household_id: hh.id, user_id: profile.value.id, role: 'owner' });

    if (memberErr) {
      console.error('Fehler beim Anlegen der Mitgliedschaft:', memberErr);
      // Roll back the household so we don't strand an unjoinable row.
      await supabase.from('households').delete().eq('id', hh.id);
      throw memberErr;
    }

    households.value.push({ ...hh, role: 'owner' });

    // Auto-switch into the new household.
    await updateProfile({ active_household_id: hh.id });

    return hh;
  };

  const switchHousehold = async (id: string) => {
    if (!profile.value) return;
    if (profile.value.active_household_id === id) return;
    if (!households.value.some(h => h.id === id)) {
      throw new Error('Kein Mitglied dieses Haushalts');
    }
    await updateProfile({ active_household_id: id });
  };

  const renameHousehold = async (id: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const idx = households.value.findIndex(h => h.id === id);
    if (idx === -1) return;
    const prev = households.value[idx].name;
    households.value[idx].name = trimmed;

    const { error } = await supabase
      .from('households')
      .update({ name: trimmed })
      .eq('id', id);

    if (error) {
      console.error('Fehler beim Umbenennen:', error);
      households.value[idx].name = prev;
      throw error;
    }
  };

  const deleteHousehold = async (id: string) => {
    if (!profile.value) throw new Error('Kein Profil geladen');

    const target = households.value.find(h => h.id === id);
    if (!target) throw new Error('Haushalt nicht gefunden');
    if (target.role !== 'owner') {
      throw new Error('Nur Inhaber:innen können einen Haushalt löschen.');
    }
    if (households.value.length <= 1) {
      throw new Error('Der letzte Haushalt kann nicht gelöscht werden.');
    }

    // If the household being deleted is the active one, switch first to avoid
    // leaving the user without an active household (ON DELETE SET NULL would
    // otherwise null out active_household_id).
    if (profile.value.active_household_id === id) {
      const fallback = households.value.find(h => h.id !== id);
      if (!fallback) throw new Error('Kein anderer Haushalt zum Umschalten verfügbar.');
      await updateProfile({ active_household_id: fallback.id });
    }

    const prevList = [...households.value];
    households.value = households.value.filter(h => h.id !== id);

    // DB cascade-deletes household_members, household-scoped data, and the
    // household_members rows automatically (FK ON DELETE CASCADE).
    const { error } = await supabase.from('households').delete().eq('id', id);
    if (error) {
      console.error('Fehler beim Löschen:', error);
      households.value = prevList;
      throw error;
    }
  };

  const clearHouseholds = () => {
    households.value = [];
  };

  return {
    households,
    loading,
    fetchMyHouseholds,
    createHousehold,
    switchHousehold,
    renameHousehold,
    deleteHousehold,
    clearHouseholds,
  };
}
