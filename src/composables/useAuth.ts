// src/composables/useAuth.ts
import { ref } from 'vue'
import { supabase } from '../supabase'
import type { User } from '@supabase/supabase-js'
import { useProfile } from './useProfile'

// Globaler State (außerhalb der Funktion, damit er überall gleich ist)
const user = ref<User | null>(null)
const isAuthReady = ref(false)

const { fetchProfile, clearProfile } = useProfile()

// Load profile after a user is set so that downstream consumers (active
// household, data composables) have it ready when isAuthReady flips true.
const resolveSession = async (sessionUser: User | null) => {
  user.value = sessionUser;
  if (sessionUser) {
    await fetchProfile(sessionUser.id);
  } else {
    clearProfile();
  }
  isAuthReady.value = true;
};

// Initialisierung sofort starten
supabase.auth.getSession().then(({ data }) => {
  resolveSession(data.session?.user ?? null);
});

supabase.auth.onAuthStateChange((_event, session) => {
  // Re-flip ready while we fetch the new profile so any in-flight router
  // navigation knows to wait again.
  isAuthReady.value = false;
  resolveSession(session?.user ?? null);
});

export function useAuth() {

  // 1. Registrieren
  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })
    if (error) throw error
    return data
  }

  // 2. Einloggen
  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw error
    return data
  }

  // 3. Ausloggen
  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    user.value = null
    clearProfile();
  }

  // 4. Passwort zurücksetzen
  const resetPassword = async (email: string) => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/update-password',
    })
    if (error) throw error
    return data
  }

  // 5. Neues Passwort setzen
  const updatePassword = async (newPassword: string) => {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword
    })
    if (error) throw error
    return data
  }

  // 6. Mit Google anmelden
  //    Stashes the post-login redirect in localStorage because the OAuth round
  //    trip (us → Google → Supabase → /auth/callback) strips our query params.
  const signInWithGoogle = async (redirectAfter?: string) => {
    if (redirectAfter && redirectAfter.startsWith('/')) {
      try {
        localStorage.setItem('magaziner:postLoginRedirect', redirectAfter);
      } catch {
        /* ignore quota / private mode */
      }
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/auth/callback' },
    });
    if (error) throw error;
  };

  // 7. Konto löschen (RPC; FK-Cascades räumen alles drumherum auf)
  const deleteAccount = async () => {
    const { error } = await supabase.rpc('delete_my_account');
    if (error) throw error;
    // The JWT still exists locally but is orphaned now. Clear local state;
    // don't surface network errors from signOut — the server may already 401.
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch {
      /* ignore */
    }
    user.value = null;
    clearProfile();
  };

  return {
    user,
    isAuthReady,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updatePassword,
    signInWithGoogle,
    deleteAccount,
  }
}
