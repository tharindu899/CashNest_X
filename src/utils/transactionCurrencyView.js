import { convertCurrency } from './currencyConverter';
import { formatMoneyForCurrency } from './currency';
import { getTransactionCurrency } from './accountViewTotals';
import { getTransferDisplayAmount } from './transferCurrency';
import { getRecordRates } from './recordRateSnapshot';

export function getTransactionSign(type = '') {
  if (type === 'income') return '+';
  if (type === 'expense') return '-';
  return '';
}

function getTransferMainCurrencyAmount(tx, accounts, appCurrency = 'LKR', activeAccountId = 'All', rates) {
  if (!tx || tx.type !== 'transfer') return 0;

  const activeIsTarget = activeAccountId && activeAccountId !== 'All' && activeAccountId === tx.toAccountId;
  const activeIsSource = activeAccountId && activeAccountId !== 'All' && activeAccountId === tx.fromAccountId;

  if ((activeIsTarget || activeAccountId === 'All') && tx.toCurrency === appCurrency && tx.toAmount != null) {
    return Number(tx.toAmount || 0);
  }

  if (activeIsSource && tx.currency === appCurrency) return Number(tx.amount || 0);

  const shownAmount = getTransferDisplayAmount(tx, accounts, activeAccountId);
  const shownCurrency = getTransactionCurrency(tx, accounts, appCurrency, activeAccountId);
  return convertCurrency(Number(shownAmount || 0), shownCurrency, appCurrency, getRecordRates(tx, rates));
}

export function shouldShowMainCurrencyLine(tx, accounts, appCurrency = 'LKR', activeAccountId = 'All') {
  if (!tx) return false;

  if (tx.type === 'transfer') {
    const shownCurrency = getTransactionCurrency(tx, accounts, appCurrency, activeAccountId);
    const hasTargetMainCurrency = tx.toCurrency === appCurrency && tx.toAmount != null;
    return !!appCurrency && (shownCurrency !== appCurrency || hasTargetMainCurrency);
  }

  const txCurrency = getTransactionCurrency(tx, accounts, appCurrency, activeAccountId);
  return !!txCurrency && !!appCurrency && txCurrency !== appCurrency;
}

export function buildMainCurrencyLine(tx, accounts, appCurrency = 'LKR', rates, activeAccountId = 'All') {
  if (!shouldShowMainCurrencyLine(tx, accounts, appCurrency, activeAccountId)) return '';

  if (tx.type === 'transfer') {
    const convertedAmount = getTransferMainCurrencyAmount(tx, accounts, appCurrency, activeAccountId, rates);
    return formatMoneyForCurrency(convertedAmount, appCurrency, { decimals: 0 });
  }

  const txCurrency = getTransactionCurrency(tx, accounts, appCurrency, activeAccountId);
  const convertedAmount = convertCurrency(Number(tx.amount || 0), txCurrency, appCurrency, getRecordRates(tx, rates));
  const sign = getTransactionSign(tx.type);
  return `${sign}${formatMoneyForCurrency(convertedAmount, appCurrency, { decimals: 0 })}`;
}
