import { useCallback, useEffect, useMemo, useState } from 'react';
import { fallbackCurrencyRates, normalizeLiveRates } from '../utils/currencyConverter';
import { readManualRateOverrides, saveManualRateOverride, removeManualRateOverride } from '../utils/rateOverrides';

const RATE_CACHE_KEY = 'cashnest_x_currency_rates_v1';
const RATE_API_URL = 'https://open.er-api.com/v6/latest/LKR';
const RATE_CACHE_TTL = 1000 * 60 * 60 * 12;

function readCachedRates() {
  try {
    const saved = JSON.parse(localStorage.getItem(RATE_CACHE_KEY) || 'null');
    if (!saved?.rates) return null;
    return saved;
  } catch (_) {
    return null;
  }
}

function saveCachedRates(payload) {
  try {
    localStorage.setItem(RATE_CACHE_KEY, JSON.stringify(payload));
  } catch (_) {}
}

function buildFallbackRates() {
  return {
    rates: fallbackCurrencyRates,
    source: 'offline',
    date: new Date().toISOString().slice(0, 10),
    updatedAt: null
  };
}

export function useCurrencyRates(open = true) {
  const cached = useMemo(readCachedRates, []);
  const [overrides, setOverrides] = useState(readManualRateOverrides());
  const [rateInfo, setRateInfo] = useState(() => {
    const base = cached || buildFallbackRates();
    return { ...base, rates: { ...fallbackCurrencyRates, ...(base.rates || {}), ...readManualRateOverrides(), LKR: 1 }, overrides: readManualRateOverrides() };
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const refreshRates = useCallback(async ({ force = false } = {}) => {
    if (!open) return;
    const cachedRates = readCachedRates();
    if (!force && cachedRates?.updatedAt && Date.now() - cachedRates.updatedAt < RATE_CACHE_TTL) {
      setRateInfo({ ...cachedRates, source: 'cached', rates: { ...fallbackCurrencyRates, ...(cachedRates.rates || {}), ...readManualRateOverrides(), LKR: 1 }, overrides: readManualRateOverrides() });
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${RATE_API_URL}?t=${Date.now()}`, { cache: 'no-store' });
      if (!response.ok) throw new Error('Rate server not available');
      const data = await response.json();
      const rates = normalizeLiveRates(data?.rates || {});
      const nextInfo = {
        rates,
        source: 'live',
        date: data?.time_last_update_utc ? new Date(data.time_last_update_utc).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
        updatedAt: Date.now()
      };
      setRateInfo({ ...nextInfo, rates: { ...nextInfo.rates, ...readManualRateOverrides(), LKR: 1 }, overrides: readManualRateOverrides() });
      saveCachedRates(nextInfo);
    } catch (err) {
      const saved = readCachedRates();
      if (saved?.rates) {
        setRateInfo({ ...saved, source: 'cached', rates: { ...fallbackCurrencyRates, ...(saved.rates || {}), ...readManualRateOverrides(), LKR: 1 }, overrides: readManualRateOverrides() });
        setError('Using saved rates. Connect internet to refresh today rate.');
      } else {
        const fallback = buildFallbackRates();
        setRateInfo({ ...fallback, rates: { ...fallback.rates, ...readManualRateOverrides(), LKR: 1 }, overrides: readManualRateOverrides() });
        setError('Using offline estimate. Connect internet to show today rate.');
      }
    } finally {
      setLoading(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    refreshRates();
  }, [open, refreshRates]);

  function setManualRate(code, rate) {
    const nextOverrides = saveManualRateOverride(code, rate);
    setOverrides(nextOverrides);
    setRateInfo((prev) => ({ ...prev, rates: { ...fallbackCurrencyRates, ...(prev.rates || {}), ...nextOverrides, LKR: 1 }, overrides: nextOverrides, source: prev.source || 'manual' }));
  }

  function resetManualRate(code) {
    const nextOverrides = removeManualRateOverride(code);
    setOverrides(nextOverrides);
    const cachedRates = readCachedRates();
    const baseRates = cachedRates?.rates || fallbackCurrencyRates;
    setRateInfo((prev) => ({ ...prev, rates: { ...fallbackCurrencyRates, ...baseRates, ...nextOverrides, LKR: 1 }, overrides: nextOverrides }));
  }

  return { ...rateInfo, rates: { ...fallbackCurrencyRates, ...(rateInfo.rates || {}), ...overrides, LKR: 1 }, overrides, loading, error, refreshRates, setManualRate, resetManualRate }; 
}
