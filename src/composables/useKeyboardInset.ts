/**
 * Keeps focused inputs visible above the on-screen keyboard.
 *
 * The app sets `interactive-widget=overlays-content` (index.html), so on
 * Chromium/Android the virtual keyboard overlays the page and **neither** the
 * layout nor the visual viewport resizes. That means VisualViewport reports
 * nothing useful there — the only reliable signal is the VirtualKeyboard API
 * (`navigator.virtualKeyboard`), which we opt into and read the keyboard
 * rectangle from. Browsers without it (Safari/Firefox) fall back to
 * VisualViewport, where the keyboard does shrink the visual viewport.
 *
 * The measured height is published as the CSS variable `--keyboard-inset` (px)
 * on <html>; CSS uses it to lift `.modal-box` modals and pad the content area,
 * and a global `focusin` handler scrolls ordinary in-page inputs into view.
 * Idempotent singleton.
 */

let initialized = false;

function setInset(px: number) {
  const v = Math.max(0, Math.round(px || 0));
  document.documentElement.style.setProperty('--keyboard-inset', `${v}px`);
}

export function useKeyboardInset() {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;

  const vk = (navigator as any).virtualKeyboard;
  if (vk) {
    // Chromium/Android: opt into overlay mode and read the keyboard rectangle.
    try {
      vk.overlaysContent = true;
    } catch {
      /* read-only in some embeds — geometrychange still fires */
    }
    vk.addEventListener('geometrychange', () => {
      setInset(vk.boundingRect?.height ?? 0);
    });
    setInset(vk.boundingRect?.height ?? 0);
  } else if (window.visualViewport) {
    // Fallback: browsers that shrink the visual viewport when the keyboard opens.
    const vv = window.visualViewport;
    const update = () => setInset(window.innerHeight - vv.height - vv.offsetTop);
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    update();
  }

  // Pull focused in-page fields above the keyboard. Modals/overlays handle
  // themselves (CSS lift / their own scroll container), so skip those.
  document.addEventListener('focusin', (e) => {
    const el = e.target as HTMLElement | null;
    if (!el || !el.matches('input, textarea, select, [contenteditable]')) return;
    if (el.closest('.modal-box, [role="dialog"], .fixed')) return;

    // Defer so the keyboard has begun animating and --keyboard-inset is current.
    setTimeout(() => {
      const inset = parseInt(
        getComputedStyle(document.documentElement).getPropertyValue('--keyboard-inset'),
        10,
      );
      if (!inset || inset <= 0) return;
      el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }, 100);
  });
}
