import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './router'

/**
 * Dev-Auto-Login für die Verifikation.
 *
 * Meldet den Test-User an, bevor die App mountet, damit der Router-Guard
 * bereits eine Session vorfindet. Greift nur, wenn VITE_DEV_LOGIN_EMAIL in
 * `.env.local` gesetzt ist — ohne die Variablen passiert exakt nichts.
 * Im Prod-Build ist `import.meta.env.DEV` false, der Block fällt komplett raus.
 *
 * Siehe scripts/seed-test-data.sql für die zugehörigen Test-Daten.
 */
async function devAutoLogin() {
  if (!import.meta.env.DEV || !import.meta.env.VITE_DEV_LOGIN_EMAIL) return

  const { supabase } = await import('./supabase')
  const { data } = await supabase.auth.getSession()
  if (data.session) return

  const { error } = await supabase.auth.signInWithPassword({
    email: import.meta.env.VITE_DEV_LOGIN_EMAIL,
    password: import.meta.env.VITE_DEV_LOGIN_PASSWORD,
  })
  if (error) console.error('[dev] Auto-Login fehlgeschlagen:', error.message)
  else console.info('[dev] Als', import.meta.env.VITE_DEV_LOGIN_EMAIL, 'angemeldet.')
}

devAutoLogin().finally(() => {
  createApp(App)
    .use(router)
    .mount('#app')
})
