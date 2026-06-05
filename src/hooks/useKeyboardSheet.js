import { useEffect, useRef, useState } from 'react';

const SCROLL_CONTAINER_SELECTOR = [
  '.sheet-scroll-content',
  '.add-tx-scroll',
  '.loan-detail-content',
  '.form-stack',
  '.modal-scroll',
  '.choice-list',
  '.detail-list'
].join(',');

function isTypingTarget(element) {
  return !!element && /^(INPUT|TEXTAREA|SELECT)$/.test(element.tagName || '');
}

function revealFocusedField(sheet) {
  const active = document.activeElement;
  if (!sheet || !isTypingTarget(active) || !sheet.contains(active)) return;

  const scroller = active.closest(SCROLL_CONTAINER_SELECTOR) || sheet;
  const scrollerRect = scroller.getBoundingClientRect();
  const activeRect = active.getBoundingClientRect();

  const topGap = activeRect.top - scrollerRect.top;
  const bottomGap = scrollerRect.bottom - activeRect.bottom;
  const bottomPadding = 86;
  const topPadding = 18;

  if (bottomGap < bottomPadding) {
    scroller.scrollTop += bottomPadding - bottomGap;
  } else if (topGap < topPadding) {
    scroller.scrollTop -= topPadding - topGap;
  }
}

export default function useKeyboardSheet(open) {
  const ref = useRef(null);
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  useEffect(() => {
    const root = document.documentElement;

    if (!open) {
      setKeyboardOpen(false);
      document.body.classList.remove('keyboard-open');
      root.style.setProperty('--keyboard-inset', '0px');
      root.style.setProperty('--keyboard-safe-height', '100dvh');
      root.style.setProperty('--keyboard-offset-top', '0px');
      return undefined;
    }

    let baseHeight = Math.round(window.visualViewport?.height || window.innerHeight || root.clientHeight || 0);

    const update = () => {
      const viewport = window.visualViewport;
      const layoutHeight = Math.round(window.innerHeight || root.clientHeight || baseHeight);
      const currentHeight = Math.round(viewport?.height || layoutHeight || baseHeight);
      const offsetTop = Math.round(viewport?.offsetTop || 0);
      const focused = document.activeElement;
      const typingTarget = isTypingTarget(focused);
      const insideSheet = !!ref.current && !!focused && ref.current.contains(focused);

      // Some Android WebViews shrink window.innerHeight when the keyboard opens,
      // so using only innerHeight - visualViewport.height returns 0. Keep the
      // largest non-typing viewport as the stable layout height while open.
      if (!typingTarget && currentHeight > baseHeight) baseHeight = currentHeight;
      if (!typingTarget && layoutHeight > baseHeight) baseHeight = layoutHeight;

      const insetFromLayout = layoutHeight - currentHeight - offsetTop;
      const insetFromBase = baseHeight - currentHeight - offsetTop;
      const measuredInset = Math.max(0, Math.round(insetFromLayout), Math.round(insetFromBase));
      const measuredKeyboardOpen = measuredInset > 80 || (typingTarget && insideSheet && currentHeight < baseHeight - 80);

      // Android Chrome/WebView builds can keep the layout viewport unchanged while
      // the keyboard overlays the page. In that case the focused input is inside
      // the sheet, but measuredInset stays 0, so we still enter keyboard mode and
      // use a conservative safe viewport height. This prevents the pay modal from
      // staying hidden behind the keyboard.
      const focusKeyboardOpen = typingTarget && insideSheet;
      const shouldOpen = measuredKeyboardOpen || focusKeyboardOpen;
      const fallbackSafeHeight = Math.max(300, Math.round((layoutHeight || baseHeight || currentHeight || 0) * 0.56));
      const measuredSafeHeight = Math.max(260, currentHeight - Math.max(0, offsetTop));
      const safeHeight = measuredKeyboardOpen ? measuredSafeHeight : Math.min(measuredSafeHeight || fallbackSafeHeight, fallbackSafeHeight);
      const fallbackInset = Math.max(0, Math.round((layoutHeight || baseHeight || currentHeight || 0) - safeHeight - offsetTop));
      const keyboardInset = measuredKeyboardOpen ? measuredInset : fallbackInset;
      const safeTop = shouldOpen ? Math.max(0, offsetTop) : 0;

      root.style.setProperty('--keyboard-inset', shouldOpen ? `${keyboardInset}px` : '0px');
      root.style.setProperty('--keyboard-safe-height', shouldOpen ? `${safeHeight}px` : '100dvh');
      root.style.setProperty('--keyboard-offset-top', shouldOpen ? `${safeTop}px` : '0px');
      document.body.classList.toggle('keyboard-open', shouldOpen);
      setKeyboardOpen(shouldOpen);

      if (shouldOpen) {
        window.setTimeout(() => revealFocusedField(ref.current), 40);
      }

      // Do not call page-level scrollIntoView for bottom sheets. It can make
      // Android Chrome scroll the fixed overlay and push footer buttons upward.
    };

    const onFocus = () => window.setTimeout(update, 80);
    const onBlur = () => window.setTimeout(update, 120);

    update();
    window.visualViewport?.addEventListener('resize', update);
    window.visualViewport?.addEventListener('scroll', update);
    window.addEventListener('resize', update);
    document.addEventListener('focusin', onFocus);
    document.addEventListener('focusout', onBlur);

    return () => {
      window.visualViewport?.removeEventListener('resize', update);
      window.visualViewport?.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      document.removeEventListener('focusin', onFocus);
      document.removeEventListener('focusout', onBlur);
      document.body.classList.remove('keyboard-open');
      root.style.setProperty('--keyboard-inset', '0px');
      root.style.setProperty('--keyboard-safe-height', '100dvh');
      root.style.setProperty('--keyboard-offset-top', '0px');
    };
  }, [open]);

  return { ref, keyboardOpen };
}
