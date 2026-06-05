const EDITABLE_SELECTOR = 'input, textarea, select, [contenteditable="true"], [contenteditable=""]';
const TOP_LAYER_SELECTOR = [
  '.root-confirm-overlay.open',
  '.choice-overlay.open',
  '.modal-overlay.open',
  '.camera-overlay',
  '.pin-setup-screen',
  '.scan-processing'
].join(', ');

function isVisible(element) {
  if (!element || !(element instanceof HTMLElement)) return false;
  const style = window.getComputedStyle(element);
  if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return false;
  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function zIndexOf(element) {
  const parsed = Number.parseInt(window.getComputedStyle(element).zIndex || '0', 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isKeyboardLikelyOpen() {
  const vv = window.visualViewport;
  if (!vv) return false;
  return window.innerHeight - vv.height > 120;
}

function closeSpecialLayer(layer) {
  if (layer.matches('.camera-overlay')) {
    layer.querySelector('.camera-topbar button, .camera-actions .secondary-btn, button')?.click();
    return true;
  }

  if (layer.matches('.pin-setup-screen')) {
    const confirm = document.querySelector('.root-confirm-overlay.open');
    if (confirm && isVisible(confirm)) {
      confirm.click();
      return true;
    }
    layer.querySelector('.pin-close-btn, button[aria-label="Close"], button')?.click();
    return true;
  }

  if (layer.matches('.scan-processing')) {
    layer.querySelector('.scan-cancel-btn, button')?.click();
    return true;
  }

  return false;
}

export function closeTopNativeBackLayer() {
  const active = document.activeElement;
  if (active?.matches?.(EDITABLE_SELECTOR)) {
    active.blur();
    if (isKeyboardLikelyOpen()) return true;
  }

  const layers = Array.from(document.querySelectorAll(TOP_LAYER_SELECTOR)).filter(isVisible);
  if (!layers.length) return false;

  const topLayer = layers
    .map((element, index) => ({ element, index, z: zIndexOf(element) }))
    .sort((a, b) => (a.z - b.z) || (a.index - b.index))
    .at(-1)?.element;

  if (!topLayer) return false;
  if (closeSpecialLayer(topLayer)) return true;

  topLayer.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
  return true;
}
