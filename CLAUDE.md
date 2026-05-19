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

**Tech stack:** Vue 3 (`<script setup>` SFCs), TypeScript, Vite, Tailwind CSS + DaisyUI, Supabase (auth + database + storage), Chart.js/vue-chartjs, vue-qrcode-reader, vite-plugin-pwa.

### Multi-household model

Every domain row (items, todos, shopping list, recipes, finance transactions, …) belongs to a `household_id`, not a `user_id`. A user is a member of one or more households via the `household_members` join table and has exactly one **active household** at a time, stored as `user_profiles.active_household_id`. RLS policies clip reads/writes to households the caller is a member of (via a `SECURITY DEFINER` helper `is_household_member(hid)` to dodge recursive-RLS pitfalls). Household-owner-only RPCs (invite creation, member removal, ownership transfer, account deletion) live in `public` schema as `SECURITY DEFINER` functions with `EXECUTE` revoked from `anon`.

When the active household changes, every domain composable is re-fetched (see `App.vue`'s watcher on `activeHouseholdId`). Inserts must include `household_id: activeHouseholdId.value`; there is no DB-side trigger filling it anymore.

### State management

No Pinia or Vuex. All shared state lives in module-level `ref()`s inside composables in `src/composables/`. Each composable owns one feature domain:

| Composable | Domain |
|---|---|
| `useAuth.ts` | Supabase auth session, login (password + Google OAuth), logout, account deletion |
| `useProfile.ts` | The current user's `user_profiles` row + avatar upload to Supabase Storage |
| `useHouseholds.ts` | List of households the user is a member of, create / rename / delete / switch |
| `useActiveHousehold.ts` | Thin selector exposing `activeHouseholdId` from the profile |
| `useHouseholdMembers.ts` | Per-household member list, kick member, transfer ownership |
| `useInvites.ts` | One reusable invite link per household: create, revoke, accept |
| `useInventory.ts` | Items, expiry, stock levels, locations, categories |
| `useDashboard.ts` | Widget layout (persisted to localStorage) |
| `useDashboardStats.ts` | Computed stats for dashboard widgets |
| `useFinance.ts` | Members, categories, transactions (expenses + payments), splits |
| `useExpenseSplits.ts` | Form-side split math shared by ExpenseWizard + finance edit modal |
| `useRecipes.ts` | Recipe CRUD |
| `useShoppingList.ts` | Shopping list items |
| `useTodos.ts` | Todo items |
| `useTheme.ts` / `useThemeColors.ts` | Light/dark theme (localStorage) + computed DaisyUI palette tokens |
| `useChangelog.ts` | What's-new pop-up: tracks last-seen version vs. `CURRENT_VERSION` |

Data fetching happens directly inside composables via the Supabase client (`src/supabase.ts`). There is no separate API layer.

### Routing

`src/router/index.ts` defines all routes and a `beforeEach` navigation guard that enforces authentication. The guard waits on `useAuth().isAuthReady` (which itself awaits profile loading) before deciding, and preserves the originally requested URL via `query.redirect` so e.g. an invite link survives the login round-trip.

Public routes (no `requiresAuth`): `/login`, `/forgot-password`, `/update-password`, `/auth/callback` (OAuth landing), `/join/:token` (invite). Everything else requires auth.

### Views and components

- `src/views/` — one file per route. Notable: `AuthCallbackView` (OAuth landing → forwards to stashed redirect target), `SettingsView` (profile + households + theme + Konto with "Gefahrenzone" for account deletion), `InviteAcceptView` (`/join/:token`, public).
- `src/components/finance/` — finance sub-views (Overview, Expenses, Statistics) **and** the multi-step `ExpenseWizard.vue` / `PaymentWizard.vue` used for *creating* transactions. Editing existing transactions still uses the inline modals in `FinanceView.vue` — split math is shared via `useExpenseSplits.ts`.
- `src/components/settings/` — `AvatarUpload`, `HouseholdSwitcher` (with invite link + member list + kick / transfer-ownership UI).
- `src/components/dashboard/` — `WidgetGallery` (sheet UI to add widgets).
- `src/components/widgets/` — dashboard widget types (all wrap `WidgetShell.vue` for consistent visuals: accent-stripe + icon + title + slot). Rendered dynamically by `DashboardView.vue` based on the user's localStorage layout. Add a new widget by: writing the `Widget*.vue`, adding its type string to `WidgetType` in `useDashboard.ts`, registering it in `WIDGET_REGISTRY` in `DashboardView.vue`, and adding a catalog entry in `WidgetGallery.vue`'s `SECTIONS`.
- `src/components/layout/` — `TheNavbar`, `TheDrawer` (app shell).
- `src/components/ChangelogModal.vue` — the "What's new" pop-up driven by `useChangelog`.

### Styling

Tailwind CSS v4 with DaisyUI v5. Use DaisyUI component classes (e.g. `btn`, `card`, `modal`, `steps`) and Tailwind utilities directly in templates. Scoped `<style>` blocks exist only where genuinely necessary — currently for the finance wizards' step/sheet transitions and `ScannerAddView`'s fade. Prefer Tailwind utilities + Vue `<Transition>` over hand-rolled keyframes when possible.

The dashboard grid is always `grid-cols-2`, regardless of viewport — widgets are designed with two columns in mind. A widget's `colSpan: 2` fills the row.

### Database changes

Schema is managed through Supabase migrations applied via the Supabase MCP `apply_migration` tool. After any DDL run `get_advisors` (security + performance) and address new lints. Common gotchas:

- pgcrypto lives in the `extensions` schema — qualify it (`extensions.gen_random_bytes(...)`) inside `SET search_path = public` functions.
- `CREATE OR REPLACE FUNCTION` resets `EXECUTE` grants; re-`REVOKE FROM PUBLIC, anon` and `GRANT TO authenticated` after every change.
- For PostgREST embed (`select('foo, related_table(*)')`) you need an explicit FK between the two tables, not a shared FK to a third table.

### Environment variables

Supabase credentials are loaded from `.env`:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_KEY` (the anon/publishable key — note the variable name omits `_ANON_`)

## Conventions

### Changelog

When you ship a user-visible feature or fix, add an entry at the **top** of `src/changelog.ts` with a bumped `version`, today's `date` (ISO), an optional short `title`, and bullets written in German from the user's perspective. Bumping the top-most version is what triggers the "What's new" pop-up on existing installs — `useChangelog.ts` compares the localStorage `lastSeenChangelogVersion` against `CURRENT_VERSION` (re-derived from `changelog[0].version`) and renders `ChangelogModal.vue` whenever there are newer entries. Brand-new installs are silently bootstrapped to the current version on first login.

Skip the entry only for invisible refactors / internal cleanups that the user wouldn't notice. When in doubt, add it — the bullets are tiny.

### German UI strings

All user-facing copy is German (`du`-form). Tooltips, alerts, errors, button labels — everything. Code identifiers and comments are English.
