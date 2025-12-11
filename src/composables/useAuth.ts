// src/composables/useAuth.ts
import { ref } from 'vue'
import { supabase } from '../supabase'
import type { User } from '@supabase/supabase-js'

// Globaler State (außerhalb der Funktion, damit er überall gleich ist)
const user = ref<User | null>(null)
const isAuthReady = ref(false) // <--- NEU: Zeigt an, ob Supabase fertig geladen hat

// Initialisierung sofort starten (nicht erst bei onMounted)
// Damit läuft der Check schon, während die App noch lädt
supabase.auth.getSession().then(({ data }) => {
  user.value = data.session?.user ?? null
  isAuthReady.value = true // <--- JETZT wissen wir Bescheid
})

supabase.auth.onAuthStateChange((_, session) => {
  user.value = session?.user ?? null
  // Falls ein Login/Logout passiert, sind wir definitiv "ready"
  isAuthReady.value = true 
})

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
  }

  return { 
    user, 
    isAuthReady, // <--- Exportieren
    signUp, 
    signIn, 
    signOut 
  }
}