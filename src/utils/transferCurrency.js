import { convertCurrency } from './currencyConverter';
import { getBestCurrencyRates } from './rateOverrides';

export function getTransferAmounts({ amount = 0, fromAccount, toAccount, rates }) {
  const sourceAmount = Number(amount || 0);
  const fromCurrency = fromAccount?.currency || 'LKR';
  const toCurrency = toAccount?.currency || fromCurrency;
  const bestRates = getBestCurrencyRates(rates);
  const targetAmount = fromCurrency === toCurrency ? sourceAmount : convertCurrency(sourceAmount, fromCurrency, toCurrency, bestRates);
  return { sourceAmount, targetAmount, fromCurrency, toCurrency };
}

export function getTransferDisplayAmount(tx = {}, accounts = [], accountId = '') {
  if (tx.type !== 'transfer') return Number(tx.amount || 0);
  if (accountId && accountId === tx.toAccountId) return Number(tx.toAmount ?? tx.amount ?? 0);
  return Number(tx.amount || 0);
}
