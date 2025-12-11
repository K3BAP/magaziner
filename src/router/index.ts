// src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router'
// We will create these components in the next steps
import DashboardView from '../views/DashboardView.vue'
import LocationDetailView from '../views/LocationDetailView.vue'
import AllItemsView from '../views/AllItemsView.vue'
import TodoView from '../views/TodoView.vue'
import LoginView from '../views/LoginView.vue'
import { useAuth } from '../composables/useAuth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: LoginView
    },
    {
      path: '/',
      name: 'dashboard',
      component: DashboardView,
      meta: { requiresAuth: true }
    },
    {
      path: '/location/:id', // Dynamic route for specific locations
      name: 'location',
      component: LocationDetailView,
      props: true, // Passes 'id' as a prop to the component
      meta: { requiresAuth: true }
    },
    {
      path: '/items',
      name: 'allItems',
      component: AllItemsView,
      meta: { requiresAuth: true }
    },
    {
      path: '/todos',
      name: 'todos',
      component: TodoView,
      meta: { requiresAuth: true }
    }
  ]
})

// Navigation Guard: Protect routes that require auth
router.beforeEach(async (to, from, next) => {
  const { user, isAuthReady } = useAuth()
  
  // Wait for Supabase to initialize session check
  // (You might need to adjust useAuth to expose a readiness promise if not already present, 
  // but for now we assume user state is reactive)
  
  // Simple check: if route requires auth and we have no user -> redirect to login
  // Note: In a real app, ensure useAuth has finished loading the session before this check.
  if (to.meta.requiresAuth && !user.value) {
    next({ name: 'login' })
  } else if (to.name === 'login' && user.value) {
    next({ name: 'dashboard' })
  } else {
    next()
  }
})

export default router