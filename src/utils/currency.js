import { defaultCurrencyCode, getCurrencyByCode } from '../models/currencies';
import { COMPACT_NUMBER_MIN, formatCompactNumber, formatPlainNumber, getCompactNumberPreference } from './numberFormat';

export const CURRENCY_KEY = 'cashnest_x_currency_v1';

export function getStoredCurrencyCode() {
  try {
    const saved = localStorage.getItem(CURRENCY_KEY);
    return saved || defaultCurrencyCode;
  } catch (_) {
    return defaultCurrencyCode;
  }
}

export function setStoredCurrencyCode(code) {
  try {
    localStorage.setItem(CURRENCY_KEY, code || defaultCurrencyCode);
  } catch (_) {}
}

export function activeCurrency() {
  return getCurrencyByCode(getStoredCurrencyCode());
}

export function money(value, options = {}) {
  return formatMoneyForCurrency(value, getStoredCurrencyCode(), options);
}

export function formatMoneyForCurrency(value, code, { decimals = 0, short = undefined, compact = undefined } = {}) {
  const currency = getCurrencyByCode(code || getStoredCurrencyCode());
  const number = Number(value || 0);
  const useCompact = compact ?? short ?? getCompactNumberPreference();
  if (useCompact) {
    if (Math.abs(number) >= COMPACT_NUMBER_MIN) {
      return `${currency.symbol} ${formatCompactNumber(number, currency.locale)}`;
    }
    return `${currency.symbol} ${formatPlainNumber(number, currency.locale, decimals)}`;
  }
  return `${currency.symbol} ${number.toLocaleString(currency.locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  })}`;
}
