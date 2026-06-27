/**
 * Keeps focused inputs visible above the on-screen keyboard.
 *
 * The app sets `interactive-widget=overlays-content` (see index.html), so the
 * virtual keyboard overlays the page *without* shrinking the layout viewport.
 * That means: bottom-anchored fixed modals stay behind the keyboard, and the
 * browser stops auto-scrolling focused in-page inputs into view (as far as
 * layout is concerned nothing moved).
 *
 * This module measures the keyboard height via the VisualViewport API and
 * publishes it as the CSS variable `--keyboard-inset` (px) on <html>. CSS uses
 * it to lift `.modal-box` modals; a global `focusin` handler scrolls ordinary
 * in-page inputs into view. Idempotent singleton — safe to call from many
 * components; the listeners are installed once.
 */

let initialized = false;

function computeInset(): number {
  const vv = window.visualViewport;
  if (!vv) return 0;
  // With overlays-content the layout viewport (window.innerHeight) stays full
  // while the visual viewport shrinks to the area above the keyboard.
  return Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
}

export function useKeyboardInset() {
  // Guard: SSR / browsers without VisualViewport → inset stays 0 (no-op).
  if (initialized || typeof window === 'undefined' || !window.visualViewport) return;
  initialized = true;

  const root = document.documentElement;

  const update = () => {
    root.style.setProperty('--keyboard-inset', `${computeInset()}px`);
  };

  window.visualViewport!.addEventListener('resize', update);
  window.visualViewport!.addEventListener('scroll', update);
  update();

  // Pull focused in-page fields above the keyboard. Modals/overlays handle
  // themselves (CSS lift / their own scroll container), so skip those.
  document.addEventListener('focusin', (e) => {
    const el = e.target as HTMLElement | null;
    if (!el || !el.matches('input, textarea, select, [contenteditable]')) return;
    if (el.closest('.modal-box, [role="dialog"], .fixed')) return;

    // Wait a frame so the keyboard has begun animating and the inset is current.
    requestAnimationFrame(() => {
      if (computeInset() <= 0) return;
      el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    });
  });
}
