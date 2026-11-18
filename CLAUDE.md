# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start Vite dev server (HTTPS via basic-ssl plugin)
npm run dev:http  # Same, but plain HTTP — for automated browser checks (see Verification)
npm run build     # Type-check (vue-tsc) + production build
npm run typecheck # vue-tsc only
npm run preview   # Preview production build
```

No test runner or linter is configured. `npm run build` (vue-tsc + Vite) is the static check.

## Verification

There is one Supabase project and it holds **production data**. To exercise the UI without
touching it, the project has an isolated test fixture.

**Never seed or test against any household other than
`00000000-0000-4000-8000-000000000001`.** All fixture rows use `00000000-…` UUIDs; real rows are
`gen_random_uuid()`.

The pieces:

- `scripts/seed-test-data.sql` — idempotent fixture (test household, two shopping lists with
  checked and unchecked entries, aisles, todos with due dates/recurrence, two locations with products
  in every expiry state, finance people/categories/transactions, a recipe whose description
  deliberately contains `<img onerror>` to check sanitising). Run it via the Supabase MCP `execute_sql`; it runs
  privileged and bypasses RLS, so no service-role key is needed. It resolves the test user by
  e-mail and aborts with a clear message if that user is missing.
- The test user `test@magaziner.test` lives in Supabase Auth. Creating users and typing passwords
  is the human's job — if it's missing, ask.
- `.env.local` (gitignored via `*.local`) holds `VITE_DEV_LOGIN_EMAIL` / `VITE_DEV_LOGIN_PASSWORD`.
  When set, `src/main.js` signs that user in **before** mounting, so the router guard finds a
  session. Guarded by `import.meta.env.DEV`, so the block is eliminated from production builds —
  re-check with `grep DEV_LOGIN dist/assets/*.js` after touching it.
- `.claude/launch.json` runs `dev:http` on port 5173. HTTP because the automated browser rejects
  basic-ssl's self-signed certificate; `localhost` is a secure context either way, so the camera
  still works. Testing the PWA from a phone over the LAN still needs plain `npm run dev`.

The loop: seed → `preview_start` → drive the UI with the browser tools → check
`read_console_messages` → confirm the write server-side with `execute_sql` → re-seed to restore the
fixture.

## Architecture

**Mein Magaziner** is a Vue 3 household inventory/management PWA backed by Supabase. It is in German.

**Tech stack:** Vue 3 (`<script setup>` SFCs), TypeScript, Vite, Tailwind CSS + DaisyUI, Supabase (auth + database + storage), Chart.js/vue-chartjs, vue-qrcode-reader, vite-plugin-pwa.

### Multi-household model

Every domain row (items, todos, shopping list, recipes, finance transactions, …) belongs to a `household_id`, not a `user_id`. A user is a member of one or more households via the `household_members` join table and has exactly one **active household** at a time, stored as `user_profiles.active_household_id`. RLS policies on domain tables clip reads/writes to the caller's **active** household via the `SECURITY DEFINER` helper `private.is_active_household(hid)` (membership-only tables like `household_members` use membership checks). So a plain `select('*')` already returns only the active household's rows. Household-owner-only RPCs (invite creation, member removal, ownership transfer, account deletion) live in `public` schema as `SECURITY DEFINER` functions with `EXECUTE` revoked from `anon`.

When the active household changes, `App.vue` clears every domain store and re-fetches (watcher on `activeHouseholdId`). Every fetch takes a `householdSnapshot()` (from `useActiveHousehold.ts`) before awaiting and drops the response if the household changed meanwhile. Inserts must include `household_id: activeHouseholdId.value`; there is no DB-side trigger filling it anymore.

### Realtime and activity

`useRealtime.ts` opens one Supabase Realtime channel per active household (tables in the
`supabase_realtime` publication: `shopping_list`, `shopping_lists`, `todos`, `items`,
`item_instances`, `activity_log`). Shopping and todo changes are applied row by row
(`applyRemote` in the composables, idempotent because our own writes echo back); inventory changes
trigger a debounced silent re-fetch. DELETE events are unfiltered and only carry the id — ignore
unknown ids. `activity_log` is written exclusively by DB triggers (`private.trg_*`) and read by the
dashboard's activity widget.

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
| `useInventory.ts` | Items, packages (instances), expiry, minimum-stock automation, barcodes, locations, categories, undo |
| `useDashboard.ts` | Widget layout, stored in `user_profiles.dashboard_layout` (localStorage is only a cache) |
| `useDashboardStats.ts` | Computed stats for dashboard widgets |
| `useFinance.ts` | Members, categories, transactions (expenses + payments), splits |
| `useExpenseSplits.ts` | Form-side split math shared by ExpenseWizard (create + edit) |
| `useRecipes.ts` | Recipe CRUD + photo upload (`recipe-images` bucket, path `{household_id}/…`) |
| `useShoppingList.ts` | Entries of the active list: add/edit/delete with undo, autocomplete history, realtime apply |
| `useShoppingLists.ts` / `useShoppingCategories.ts` | Multiple lists per household / aisles |
| `useTodos.ts` | Todos with due date, assignee, recurrence (completing spawns the next one) |
| `useActivity.ts` | Household activity feed (`activity_log`) |
| `useRealtime.ts` | One realtime channel per active household |
| `useToast.ts` / `useConfirm.ts` | App-wide snackbar (with undo) and promise-based confirm sheet |
| `usePageTitle.ts` | Lets a view override the header title |
| `useTheme.ts` / `useThemeColors.ts` | Light/dark/system mode + computed DaisyUI palette tokens |
| `useChangelog.ts` | What's-new pop-up: tracks last-seen version vs. `CURRENT_VERSION`, can be opened by hand |

Data fetching happens directly inside composables via the Supabase client (`src/supabase.ts`). There is no separate API layer.

### Routing

`src/router/index.ts` defines all routes and a `beforeEach` navigation guard that enforces authentication. The guard waits on `useAuth().isAuthReady` (which itself awaits profile loading) before deciding, and preserves the originally requested URL via `query.redirect` so e.g. an invite link survives the login round-trip.

Public routes (no `requiresAuth`): `/login`, `/forgot-password`, `/update-password`, `/auth/callback` (OAuth landing), `/join/:token` (invite). Everything else requires auth.

Route `meta` (typed in `src/router/meta.d.ts`) drives the shell: `layout: 'bare'` renders without
app bar/tab bar, `title` is the header title, `tab` highlights the bottom tab, `back` is the
fallback route for the header's back arrow. Routes are lazy-loaded except the dashboard.

### Views and components

- `src/views/` — one file per route. Notable: `AuthCallbackView` (OAuth landing → forwards to stashed redirect target), `SettingsView` (profile + households + theme + Konto with "Gefahrenzone" for account deletion), `InviteAcceptView` (`/join/:token`, public).
- `src/components/finance/` — finance sub-views (Overview with settle-up suggestions, Expenses grouped by month, Statistics) **and** the multi-step `ExpenseWizard.vue` / `PaymentWizard.vue`, used for both creating and editing (`transaction` prop; `PaymentWizard` also takes `prefill` for „Ausgleichen“).
- `src/components/settings/` — `AvatarUpload`, `HouseholdSwitcher` (with invite link + member list + kick / transfer-ownership UI).
- `src/components/dashboard/` — `WidgetGallery` (sheet UI to add widgets).
- `src/components/widgets/` — dashboard widget types (all wrap `WidgetShell.vue`: surface card + tinted icon chip + title + slot; counters use `WidgetStat.vue`). Rendered dynamically by `DashboardView.vue` from the user's layout; chart widgets are async components. Add a new widget by: writing the `Widget*.vue`, adding its type string to `WidgetType` in `useDashboard.ts`, registering it in `WIDGET_REGISTRY` in `DashboardView.vue`, and adding a catalog entry in `WidgetGallery.vue`'s `SECTIONS`.
- `src/components/layout/` — `TheAppBar` (title, back arrow, `#header-actions` teleport target, avatar), `TheTabBar` (bottom navigation, publishes `--tabbar-h`), `MoreSheet`.
- `src/components/ui/` — shared primitives: `BottomSheet` (**the** modal — never use daisyUI `modal`/`<dialog>` or `alert`/`confirm`), `ToastHost`, `ConfirmHost`, `AppFab`, `SwipeRow`, `Stepper`, `EmptyState`, `SectionHeader`, `Skeleton`, `UserAvatar`, `BrandMark`, `OfflineBanner`.
- `src/components/inventory/`, `shopping/`, `todos/` — feature sheets (item form/detail, location, categories, shopping item edit, stock-from-shopping, todo editor).
- `src/components/ChangelogModal.vue` — the "What's new" sheet driven by `useChangelog`; entries with `highlights` get a page-by-page tour first.

### Styling

Tailwind CSS v4 with DaisyUI v5 and two custom themes defined in `src/style.css`: `magaziner` (light, default) and `magaziner-dark`. Font: Figtree (self-hosted via `@fontsource-variable`). Custom utilities: `surface` (the standard card), `pressable` (tap feedback), `font-display` (headings). Use DaisyUI component classes (`btn`, `input`, `tabs`, …) plus Tailwind utilities; don't hard-code colours — use theme tokens (`text-primary`, `bg-base-200`, …).

Layout rules: the page lives in `App.vue`'s `<main>` (max-w-2xl). Anything `position: fixed` inside a view (add bars, edit bars) must be teleported to `body` — the route transition applies a `transform`, which would re-anchor it. Use `--tabbar-h`, `--keyboard-inset` and `env(safe-area-inset-*)` for bottom offsets. Feedback goes through `toast` (with `toast.undo(...)` for destructive actions) — prefer undo over a confirmation; use `confirmDialog` only for things that can't be undone.

Dates: all DB dates are local `YYYY-MM-DD`. Use `src/utils/date.ts` (`todayLocalISO`, `daysUntil`, `expiryStatus`, …) — never `toISOString().split('T')[0]`. Search: use `normalize`/`searchTerms` from `src/utils/text.ts` (umlaut-tolerant).

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
