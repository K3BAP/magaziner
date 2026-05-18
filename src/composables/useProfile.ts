import { ref } from 'vue';
import { supabase } from '../supabase';

export interface UserProfile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  active_household_id: string | null;
  created_at: string;
  updated_at: string;
}

const profile = ref<UserProfile | null>(null);
const loading = ref(false);

export function useProfile() {
  const fetchProfile = async (userId: string): Promise<UserProfile | null> => {
    loading.value = true;
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Fehler beim Laden des Profils:', error);
        return null;
      }
      profile.value = data;
      return data;
    } finally {
      loading.value = false;
    }
  };

  const updateProfile = async (patch: Partial<Pick<UserProfile, 'display_name' | 'avatar_url' | 'active_household_id'>>) => {
    if (!profile.value) return;

    const prev = { ...profile.value };
    // Optimistic update
    profile.value = { ...profile.value, ...patch };

    const { error } = await supabase
      .from('user_profiles')
      .update(patch)
      .eq('id', prev.id);

    if (error) {
      console.error('Fehler beim Speichern des Profils:', error);
      profile.value = prev;
      throw error;
    }
  };

  const uploadAvatar = async (file: File): Promise<string> => {
    if (!profile.value) throw new Error('Kein Profil geladen');

    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    // Cache-bust via timestamp suffix so the public URL refreshes immediately.
    const path = `${profile.value.id}/avatar-${Date.now()}.${ext}`;

    const { error: uploadErr } = await supabase
      .storage
      .from('avatars')
      .upload(path, file, {
        cacheControl: '3600',
        upsert: true,
        contentType: file.type || 'image/jpeg',
      });

    if (uploadErr) throw uploadErr;

    const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path);
    await updateProfile({ avatar_url: pub.publicUrl });
    return pub.publicUrl;
  };

  const clearProfile = () => {
    profile.value = null;
  };

  return {
    profile,
    loading,
    fetchProfile,
    updateProfile,
    uploadAvatar,
    clearProfile,
  };
}
