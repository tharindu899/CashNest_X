import { getBestCurrencyRates } from './rateOverrides';

export function createRecordRateSnapshot(rates = {}, meta = {}) {
  const sourceRates = getBestCurrencyRates(rates);
  return {
    rates: { ...sourceRates, LKR: 1 },
    baseCurrency: meta.baseCurrency || 'LKR',
    source: meta.source || 'saved-at-record-time',
    savedAt: meta.savedAt || Date.now(),
    dateValue: meta.dateValue || ''
  };
}

export function getRecordRates(record, fallbackRates) {
  if (record?.rateSnapshot?.rates && typeof record.rateSnapshot.rates === 'object') {
    return { ...record.rateSnapshot.rates, LKR: 1 };
  }
  if (record?.exchangeRates && typeof record.exchangeRates === 'object') {
    return { ...record.exchangeRates, LKR: 1 };
  }
  return getBestCurrencyRates(fallbackRates);
}

export function describeRecordRate(record, fromCode, toCode) {
  const rates = getRecordRates(record);
  const fromRate = Number(rates?.[fromCode] || 0);
  const toRate = Number(rates?.[toCode] || 0);
  if (!fromCode || !toCode || fromCode === toCode || !fromRate || !toRate) return '';
  const one = fromRate / toRate;
  return `Saved rate: 1 ${fromCode} = ${one.toLocaleString(undefined, { maximumFractionDigits: 4 })} ${toCode}`;
}
