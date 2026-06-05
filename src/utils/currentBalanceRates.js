import { convertCurrency } from './currencyConverter';
import { getBestCurrencyRates } from './rateOverrides';

// Current account balances are money the user still has now.
// So the main-currency value must use the latest/manual currency rate.
// Transaction/report history uses each record's saved rate snapshot separately.
export function getCurrentBalanceRates(rates) {
  return getBestCurrencyRates(rates);
}

export function convertCurrentBalance(amount = 0, fromCurrency = 'LKR', toCurrency = 'LKR', rates) {
  return convertCurrency(Number(amount || 0), fromCurrency || toCurrency || 'LKR', toCurrency || 'LKR', getCurrentBalanceRates(rates));
}

export function buildCurrentBalanceTotal(accounts = [], targetCurrency = 'LKR', rates) {
  const currentRates = getCurrentBalanceRates(rates);
  return accounts
    .filter((account) => !account.hideFromTotal)
    .reduce((sum, account) => {
      return sum + convertCurrency(Number(account.balance || 0), account.currency || targetCurrency, targetCurrency, currentRates);
    }, 0);
}

export function hasDifferentCurrencyBalance(accounts = [], appCurrency = 'LKR', activeCurrency = '') {
  if (activeCurrency && activeCurrency !== appCurrency) return true;
  return accounts.some((account) => !account.hideFromTotal && (account.currency || appCurrency) !== appCurrency && Number(account.balance || 0) !== 0);
}
