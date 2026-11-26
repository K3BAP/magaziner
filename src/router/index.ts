// src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router'
import DashboardView from '../views/DashboardView.vue'
import { useAuth } from '../composables/useAuth'
import { watch } from 'vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      meta: { layout: 'bare' },
      component: () => import('../views/LoginView.vue'),
    },
    {
      // OAuth landing page — Supabase auto-exchanges the ?code= param into a
      // session on load (detectSessionInUrl default), this view just waits
      // for the session and forwards to the stashed redirect target.
      path: '/auth/callback',
      name: 'authCallback',
      meta: { layout: 'bare' },
      component: () => import('../views/AuthCallbackView.vue'),
    },
    {
      path: '/forgot-password',
      name: 'forgotPassword',
      meta: { layout: 'bare' },
      component: () => import('../views/ForgotPasswordView.vue')
    },
    {
      path: '/update-password',
      name: 'updatePassword',
      meta: { layout: 'bare' },
      component: () => import('../views/UpdatePasswordView.vue')
    },
    {
      path: '/',
      name: 'dashboard',
      meta: { requiresAuth: true, title: 'Übersicht', tab: 'dashboard' },
      component: DashboardView,
    },
    {
      path: '/locations', // Neue Route für die Kacheln
      name: 'locations',
      meta: { requiresAuth: true, title: 'Vorräte', tab: 'more' },
      component: () => import('../views/LocationsView.vue'),
    },
    {
      path: '/scanner',
      name: 'scanner',
      meta: { requiresAuth: true, title: 'Barcode scannen', tab: 'more', back: 'locations' },
      component: () => import('../views/ScannerAddView.vue'),
    },
    {
      path: '/location/:id',
      name: 'location',
      meta: { requiresAuth: true, title: 'Vorräte', tab: 'more', back: 'locations' },
      component: () => import('../views/LocationDetailView.vue'),
      props: true,
    },
    {
      path: '/items',
      name: 'allItems',
      meta: { requiresAuth: true, title: 'Alle Vorräte', tab: 'more', back: 'locations' },
      component: () => import('../views/AllItemsView.vue'),
    },
    {
      path: '/todos',
      name: 'todos',
      meta: { requiresAuth: true, title: 'Aufgaben', tab: 'tasks' },
      component: () => import('../views/TodoView.vue'),
    },
    {
      path: '/shopping-list',
      name: 'shoppingList',
      meta: { requiresAuth: true, title: 'Einkaufsliste', tab: 'shopping' },
      component: () => import('../views/ShoppingListView.vue'),
    },
    {
      path: '/recipes',
      name: 'recipes',
      meta: { requiresAuth: true, title: 'Rezepte', tab: 'more' },
      component: () => import('../views/RecipesView.vue'),
    },
    {
      path: '/recipes/:id',
      name: 'recipe-detail',
      meta: { requiresAuth: true, title: 'Rezept', tab: 'more', back: 'recipes' },
      component: () => import('../views/RecipeDetailView.vue'),
    },
    {
      path: '/finance',
      name: 'finance',
      meta: { requiresAuth: true, title: 'Finanzen', tab: 'finance' },
      component: () => import('../views/FinanceView.vue'),
    },
    {
      path: '/settings',
      name: 'settings',
      meta: { requiresAuth: true, title: 'Einstellungen', tab: 'more' },
      component: () => import('../views/SettingsView.vue'),
    },
    {
      // Public route — the view itself bounces unauthenticated visitors to
      // /login?redirect=... so the same link works for invited friends who
      // don't have an account yet.
      path: '/join/:token',
      name: 'invite-accept',
      meta: { layout: 'bare' },
      component: () => import('../views/InviteAcceptView.vue'),
      props: true,
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: { name: 'dashboard' },
    },
  ],
  scrollBehavior(to, _from, saved) {
    if (saved) return saved
    if (to.hash) return { el: to.hash }
    return { top: 0 }
  },
})

// Navigation Guard
router.beforeEach(async (to, from, next) => {
  const { user, isAuthReady } = useAuth()

  // 1. WARTEN: Wenn Supabase noch nicht fertig ist, warten wir
  if (!isAuthReady.value) {
    await new Promise<void>((resolve) => {
      const stopWatch = watch(isAuthReady, (isReady) => {
        if (isReady) {
          stopWatch()
          resolve()
        }
      })
    })
  }

  // 2. PRÜFEN: Jetzt wissen wir sicher, ob user da ist oder nicht
  if (to.meta.requiresAuth && !user.value) {
    // Preserve the originally requested URL so e.g. an invite link survives
    // the login round-trip. LoginView reads `query.redirect` after auth.
    next({ name: 'login', query: { redirect: to.fullPath } })
  } else if (to.name === 'login' && user.value) {
    next({ name: 'dashboard' })
  } else {
    next()
  }
})

export default router