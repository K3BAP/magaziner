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

  return {
    user,
    isAuthReady,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updatePassword
  }
}
