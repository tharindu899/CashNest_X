import { useEffect } from 'react';

const PRESSABLE_SELECTOR = [
  'button',
  '.quick-item',
  '.tx-item',
  '.tx-card-button',
  '.loan-card',
  '.setting-item',
  '.account-card',
  '.budget-card',
  '.icon-btn',
  '.avatar-btn',
  '.nav-btn',
  '.nav-plus',
  '.field',
  '.type-tab',
  '.cat-item',
  '.choice-item',
  '.filter-picker-btn',
  '.form-picker-btn',
  '.wide-action-btn',
  '.loan-close-btn',
  '.loan-delete-btn'
].join(',');

/**
 * App-wide mobile smoothness helper.
 * - Keeps Android WebView height stable when the keyboard opens.
 * - Adds low-cost tap feedback without per-component state.
 * - Pauses heavy transitions while scrolling/resizing.
 * - Keeps focused inputs visible above the keyboard.
 */
export function useSmoothApp() {
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    let viewportRaf = 0;
    let scrollTimer = 0;
    let resizeTimer = 0;
    let inputTimer = 0;
    let pressedEl = null;
    let lastHeight = 0;
    let lastInset = -1;
    let stableLayoutHeight = Math.round(window.visualViewport?.height || window.innerHeight || document.documentElement.clientHeight || 0);

    const setClassSoon = (name, enabled, timeout = 180) => {
      body.classList.toggle(name, enabled);
      if (!enabled) return;
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => body.classList.remove(name), timeout);
    };

    const writeViewportVars = () => {
      window.cancelAnimationFrame(viewportRaf);
      viewportRaf = window.requestAnimationFrame(() => {
        const viewport = window.visualViewport;
        const visibleHeight = Math.round(viewport?.height || window.innerHeight || document.documentElement.clientHeight || 0);
        const topOffset = Math.round(viewport?.offsetTop || 0);
        const layoutHeight = Math.round(window.innerHeight || document.documentElement.clientHeight || visibleHeight);
        const focused = document.activeElement;
        const isTypingTarget = !!focused && /^(INPUT|TEXTAREA|SELECT)$/.test(focused.tagName || '');

        if (!isTypingTarget && layoutHeight > stableLayoutHeight) stableLayoutHeight = layoutHeight;
        if (!isTypingTarget && visibleHeight > stableLayoutHeight) stableLayoutHeight = visibleHeight;

        const keyboardInset = Math.max(
          0,
          Math.round(layoutHeight - visibleHeight - topOffset),
          Math.round(stableLayoutHeight - visibleHeight - topOffset)
        );
        const keyboardOpen = keyboardInset > 80 || (isTypingTarget && visibleHeight < stableLayoutHeight - 80);
        const safeHeight = keyboardOpen ? Math.max(260, visibleHeight - Math.max(0, topOffset)) : visibleHeight;
        const safeTop = keyboardOpen ? Math.max(0, topOffset) : 0;

        if (Math.abs(visibleHeight - lastHeight) > 1) {
          lastHeight = visibleHeight;
          root.style.setProperty('--app-vh', `${visibleHeight * 0.01}px`);
          root.style.setProperty('--keyboard-safe-height', keyboardOpen ? `${safeHeight}px` : '100dvh');
          root.style.setProperty('--keyboard-offset-top', keyboardOpen ? `${safeTop}px` : '0px');
          setClassSoon('is-resizing', true, 160);
        }
        if (Math.abs(keyboardInset - lastInset) > 1) {
          lastInset = keyboardInset;
          root.style.setProperty('--keyboard-inset', keyboardOpen ? `${keyboardInset}px` : '0px');
          root.style.setProperty('--keyboard-safe-height', keyboardOpen ? `${safeHeight}px` : '100dvh');
          root.style.setProperty('--keyboard-offset-top', keyboardOpen ? `${safeTop}px` : '0px');
          body.classList.toggle('keyboard-open', keyboardOpen);
          setClassSoon('is-resizing', true, 180);
        }
      });
    };

    const markScrolling = () => {
      body.classList.add('is-scrolling');
      window.clearTimeout(scrollTimer);
      scrollTimer = window.setTimeout(() => body.classList.remove('is-scrolling'), 120);
      clearPressed();
    };

    const clearPressed = () => {
      if (!pressedEl) return;
      pressedEl.classList.remove('pressing');
      pressedEl = null;
    };

    const onPointerDown = (event) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      const target = event.target?.closest?.(PRESSABLE_SELECTOR);
      if (!target || target.disabled || target.getAttribute('aria-disabled') === 'true') return;
      clearPressed();
      pressedEl = target;
      target.classList.add('pressing');
    };

    const onInputFocus = (event) => {
      const target = event.target;
      if (!target || !('scrollIntoView' in target)) return;
      window.clearTimeout(inputTimer);
      inputTimer = window.setTimeout(() => {
        try {
          const insideSheet = !!target.closest?.('.modal-sheet, .choice-sheet, .update-sheet, .edit-currency-sheet');
          // Bottom sheets now own their scroll area and footer. Android Chrome/WebView
          // already keeps the focused field visible when the visual viewport resizes.
          // Avoid page-level scrollIntoView here because it was pulling sheet footers
          // to the top above the keyboard.
          if (insideSheet) return;
          target.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' });
        } catch {
          target.scrollIntoView(false);
        }
      }, 260);
    };

    body.classList.add('smooth-ready');
    root.style.setProperty('--keyboard-inset', '0px');
    root.style.setProperty('--keyboard-safe-height', '100dvh');
    writeViewportVars();

    window.addEventListener('resize', writeViewportVars, { passive: true });
    window.addEventListener('orientationchange', writeViewportVars, { passive: true });
    window.visualViewport?.addEventListener('resize', writeViewportVars, { passive: true });
    window.visualViewport?.addEventListener('scroll', writeViewportVars, { passive: true });
    document.addEventListener('scroll', markScrolling, { passive: true, capture: true });
    document.addEventListener('pointerdown', onPointerDown, { passive: true, capture: true });
    document.addEventListener('pointerup', clearPressed, { passive: true, capture: true });
    document.addEventListener('pointercancel', clearPressed, { passive: true, capture: true });
    document.addEventListener('visibilitychange', clearPressed, { passive: true });
    document.addEventListener('focusin', onInputFocus, { passive: true });

    return () => {
      window.cancelAnimationFrame(viewportRaf);
      window.clearTimeout(scrollTimer);
      window.clearTimeout(resizeTimer);
      window.clearTimeout(inputTimer);
      clearPressed();
      body.classList.remove('smooth-ready', 'keyboard-open', 'is-scrolling', 'is-resizing');
      window.removeEventListener('resize', writeViewportVars);
      window.removeEventListener('orientationchange', writeViewportVars);
      window.visualViewport?.removeEventListener('resize', writeViewportVars);
      window.visualViewport?.removeEventListener('scroll', writeViewportVars);
      document.removeEventListener('scroll', markScrolling, { capture: true });
      document.removeEventListener('pointerdown', onPointerDown, { capture: true });
      document.removeEventListener('pointerup', clearPressed, { capture: true });
      document.removeEventListener('pointercancel', clearPressed, { capture: true });
      document.removeEventListener('visibilitychange', clearPressed);
      document.removeEventListener('focusin', onInputFocus);
    };
  }, []);
}
