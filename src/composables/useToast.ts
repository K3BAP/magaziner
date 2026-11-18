import { ref } from 'vue';

/**
 * App-wide snackbar. Replaces `alert()` for feedback and errors, and carries an
 * optional action (typically „Rückgängig“). Rendered by `ui/ToastHost.vue`.
 */

export type ToastKind = 'info' | 'success' | 'error' | 'warning';

export interface ToastAction {
  label: string;
  run: () => unknown;
}

export interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
  action?: ToastAction;
  duration: number;
}

const toasts = ref<Toast[]>([]);
let nextId = 1;
const timers = new Map<number, ReturnType<typeof setTimeout>>();

function dismiss(id: number) {
  toasts.value = toasts.value.filter((t) => t.id !== id);
  const timer = timers.get(id);
  if (timer) clearTimeout(timer);
  timers.delete(id);
}

function show(message: string, opts: { kind?: ToastKind; action?: ToastAction; duration?: number } = {}) {
  const id = nextId++;
  const duration = opts.duration ?? (opts.action ? 6000 : opts.kind === 'error' ? 5000 : 3000);
  toasts.value.push({ id, kind: opts.kind ?? 'info', message, action: opts.action, duration });
  // Keep the stack short on a phone screen.
  while (toasts.value.length > 3) dismiss(toasts.value[0].id);
  timers.set(id, setTimeout(() => dismiss(id), duration));
  return id;
}

async function runAction(t: Toast) {
  dismiss(t.id);
  await t.action?.run();
}

export const toast = {
  show,
  info: (msg: string, action?: ToastAction) => show(msg, { kind: 'info', action }),
  success: (msg: string, action?: ToastAction) => show(msg, { kind: 'success', action }),
  warning: (msg: string, action?: ToastAction) => show(msg, { kind: 'warning', action }),
  error: (msg: string, err?: unknown) => {
    if (err) console.error(msg, err);
    return show(msg, { kind: 'error' });
  },
  /** Shorthand for the undo pattern: „X gelöscht · Rückgängig“. */
  undo: (msg: string, run: () => unknown) =>
    show(msg, { kind: 'info', action: { label: 'Rückgängig', run } }),
  dismiss,
};

export function useToast() {
  return { toasts, toast, dismiss, runAction };
}
