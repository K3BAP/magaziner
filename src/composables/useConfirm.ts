import { ref } from 'vue';

/**
 * Promise-based confirmation sheet. Replaces `window.confirm()`:
 *
 *   if (!(await confirmDialog({ title: 'Löschen?', danger: true }))) return;
 *
 * Rendered by `ui/ConfirmHost.vue`.
 */

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

interface Pending extends ConfirmOptions {
  resolve: (ok: boolean) => void;
}

const pending = ref<Pending | null>(null);

export function confirmDialog(opts: ConfirmOptions): Promise<boolean> {
  // A second request while one is open cancels the first.
  pending.value?.resolve(false);
  return new Promise((resolve) => {
    pending.value = { ...opts, resolve };
  });
}

export function useConfirm() {
  const answer = (ok: boolean) => {
    const p = pending.value;
    pending.value = null;
    p?.resolve(ok);
  };
  return { pending, answer, confirmDialog };
}
