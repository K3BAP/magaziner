import 'vue-router';

export {};

declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean;
    /** 'bare' = no app shell (auth pages, invite landing). */
    layout?: 'bare' | 'app';
    /** Static header title; views can override via usePageTitle(). */
    title?: string;
    /** Which bottom tab is highlighted. */
    tab?: 'dashboard' | 'tasks' | 'shopping' | 'finance' | 'more';
    /** Route name the header back arrow falls back to. */
    back?: string;
  }
}
