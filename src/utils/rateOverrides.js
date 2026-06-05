import { fallbackCurrencyRates } from './currencyConverter';

const OVERRIDE_KEY = 'cashnest_x_manual_currency_rates_v1';
const RATE_CACHE_KEY = 'cashnest_x_currency_rates_v1';

export function readManualRateOverrides() {
  try {
    const saved = JSON.parse(localStorage.getItem(OVERRIDE_KEY) || '{}');
    return saved && typeof saved === 'object' ? saved : {};
  } catch (_) {
    return {};
  }
}

export function saveManualRateOverride(code, rate) {
  const value = Number(rate || 0);
  if (!code || code === 'LKR' || !Number.isFinite(value) || value <= 0) return readManualRateOverrides();
  const next = { ...readManualRateOverrides(), [code]: value };
  localStorage.setItem(OVERRIDE_KEY, JSON.stringify(next));
  return next;
}

export function removeManualRateOverride(code) {
  const next = { ...readManualRateOverrides() };
  delete next[code];
  localStorage.setItem(OVERRIDE_KEY, JSON.stringify(next));
  return next;
}

export function readCachedCurrencyRates() {
  try {
    const saved = JSON.parse(localStorage.getItem(RATE_CACHE_KEY) || 'null');
    return saved?.rates || null;
  } catch (_) {
    return null;
  }
}

export function getBestCurrencyRates(baseRates) {
  return { ...fallbackCurrencyRates, ...(readCachedCurrencyRates() || {}), ...(baseRates || {}), ...readManualRateOverrides(), LKR: 1 };
}
