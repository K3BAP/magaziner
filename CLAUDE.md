# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start Vite dev server (HTTPS via basic-ssl plugin)
npm run build    # Build for production
npm run preview  # Preview production build
```

No test runner or linter is configured.

## Architecture

**Mein Magaziner** is a Vue 3 household inventory/management PWA backed by Supabase. It is in German.

**Tech stack:** Vue 3 (`<script setup>` SFCs), TypeScript, Vite, Tailwind CSS + DaisyUI, Supabase (auth + database), Chart.js/vue-chartjs, vue-qrcode-reader, vite-plugin-pwa.

### State management

There is no Pinia or Vuex. All shared state lives in module-level `ref()`s inside composables in `src/composables/`. Each composable owns a feature domain:

| Composable | Domain |
|---|---|
| `useAuth.ts` | Supabase auth session, login/logout |
| `useInventory.ts` | Items, expiry, stock levels |
| `useDashboard.ts` | Widget layout (persisted to localStorage) |
| `useDashboardStats.ts` | Computed stats for dashboard widgets |
| `useFinance.ts` | Expense records and categories |
| `useRecipes.ts` | Recipe CRUD |
| `useShoppingList.ts` | Shopping list items |
| `useTodos.ts` | Todo items |

Data fetching happens directly inside composables via the Supabase client (`src/supabase.ts`). There is no separate API layer.

### Routing

`src/router/index.ts` defines all 13 routes and a `beforeEach` navigation guard that enforces authentication. Unauthenticated users are redirected to `/login`.

### Views and components

- `src/views/` — one file per route (DashboardView, FinanceView, LocationsView, etc.)
- `src/components/finance/` — finance-specific sub-components
- `src/components/layout/` — TheNavbar, TheDrawer (app shell)
- `src/components/widgets/` — eight dashboard widget types rendered dynamically based on user configuration stored in localStorage

### Styling

Tailwind CSS v4 with DaisyUI v5. Use DaisyUI component classes (e.g. `btn`, `card`, `modal`) and Tailwind utilities directly in templates. There are no scoped `<style>` blocks.

### Environment variables

Supabase credentials are loaded from `.env`:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
