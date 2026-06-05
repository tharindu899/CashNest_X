import { getCurrencyByCode } from '../models/currencies';

// Offline fallback rates using LKR as the app base. Users can still use the
// converter without internet; exact live bank rates can be added later.
export const fallbackCurrencyRates = {
  LKR: 1,
  USD: 300,
  EUR: 326,
  GBP: 382,
  INR: 3.6,
  AED: 81.7,
  AUD: 198,
  CAD: 220,
  SGD: 232,
  JPY: 2.05,
  CNY: 41.5,
  SAR: 80,
  QAR: 82.4,
  KWD: 980,
  MYR: 64,
  THB: 8.2
};

export function normalizeLiveRates(apiRates = {}) {
  // The live API returns rates as target currency per 1 LKR. CashNest X stores
  // converter rates as LKR per 1 currency so every account can compare cleanly.
  const next = { ...fallbackCurrencyRates, LKR: 1 };
  Object.entries(apiRates).forEach(([code, rate]) => {
    const number = Number(rate);
    if (code === 'LKR') next.LKR = 1;
    else if (Number.isFinite(number) && number > 0) next[code] = 1 / number;
  });
  return next;
}

export function convertCurrency(amount, fromCode, toCode, rates = fallbackCurrencyRates) {
  const value = Number(amount || 0);
  const fromRate = rates[fromCode] || fallbackCurrencyRates[fromCode] || 1;
  const toRate = rates[toCode] || fallbackCurrencyRates[toCode] || 1;
  if (!Number.isFinite(value)) return 0;
  return (value * fromRate) / toRate;
}

export function getCurrencyRateLine(fromCode, toCode, rates = fallbackCurrencyRates) {
  const convertedOne = convertCurrency(1, fromCode, toCode, rates);
  return `1 ${fromCode} = ${formatConvertedCurrency(convertedOne, toCode, 2)}`;
}

export function formatConvertedCurrency(amount, code, decimals = 2) {
  const currency = getCurrencyByCode(code);
  const value = Number(amount || 0);
  return `${currency.symbol} ${value.toLocaleString(currency.locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  })}`;
}
