// src/composables/useAuth.ts
import { ref, onMounted } from 'vue'
import { supabase } from '../supabase'
import type { User } from '@supabase/supabase-js'

const user = ref<User | null>(null)

export function useAuth() {
  
  onMounted(() => {
    // Session beim Start laden
    supabase.auth.getSession().then(({ data }) => {
      user.value = data.session?.user ?? null
    })

    // Auf Login/Logout hören
    supabase.auth.onAuthStateChange((_, session) => {
      user.value = session?.user ?? null
    })
  })

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

  return { user, signUp, signIn, signOut }
}