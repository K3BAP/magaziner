// src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router'
// We will create these components in the next steps
import DashboardView from '../views/DashboardView.vue'
import LocationDetailView from '../views/LocationDetailView.vue'
import LocationsView from '../views/LocationsView.vue'
import AllItemsView from '../views/AllItemsView.vue'
import TodoView from '../views/TodoView.vue'
import LoginView from '../views/LoginView.vue'
import ShoppingListView from '../views/ShoppingListView.vue'
import RecipesView from '../views/RecipesView.vue'
import RecipeDetailView from '../views/RecipeDetailView.vue'
import FinanceView from '../views/FinanceView.vue'
import { useAuth } from '../composables/useAuth'
import { watch } from 'vue'

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
      component: DashboardView, // Zeigt jetzt das Chart-Dashboard
      meta: { requiresAuth: true }
    },
    {
      path: '/locations', // Neue Route für die Kacheln
      name: 'locations',
      component: LocationsView,
      meta: { requiresAuth: true }
    },
    {
      path: '/location/:id',
      name: 'location',
      component: LocationDetailView,
      props: true,
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
    },
    {
      path: '/shopping-list',
      name: 'shoppingList',
      component: ShoppingListView,
      meta: { requiresAuth: true }
    },
    {
      path: '/recipes',
      name: 'recipes',
      component: RecipesView,
      meta: { requiresAuth: true }
    },
    {
      path: '/recipes/:id',
      name: 'recipe-detail',
      component: RecipeDetailView,
      meta: { requiresAuth: true }
    },
    {
      path: '/finance',
      name: 'finance',
      component: FinanceView,
      meta: { requiresAuth: true }
    }
  ]
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
    next({ name: 'login' })
  } else if (to.name === 'login' && user.value) {
    next({ name: 'dashboard' })
  } else {
    next()
  }
})

export default router