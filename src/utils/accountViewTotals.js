import { convertCurrency } from './currencyConverter';
import { getRecordRates } from './recordRateSnapshot';
import { buildCurrentBalanceTotal } from './currentBalanceRates';
import { visibleTransactionsForAccountFilter } from './transactionFilters';

function sumTransactions(transactions, predicate) {
  return transactions.reduce((sum, tx) => predicate(tx) ? sum + Number(tx.amount || 0) : sum, 0);
}

export function getTransactionAmountInCurrency(tx, accounts = [], targetCurrency = 'LKR', rates, activeAccountId = '') {
  if (!tx) return 0;
  if (tx.type === 'transfer') {
    const activeIsTarget = activeAccountId && activeAccountId !== 'All' && activeAccountId === tx.toAccountId;
    const amount = activeIsTarget ? Number(tx.toAmount ?? tx.amount ?? 0) : Number(tx.amount || 0);
    const sourceCurrency = activeIsTarget
      ? (tx.toCurrency || resolveAccountCurrency(accounts, tx.toAccountId, targetCurrency))
      : (tx.currency || resolveAccountCurrency(accounts, tx.fromAccountId, targetCurrency));
    return convertCurrency(amount, sourceCurrency, targetCurrency, getRecordRates(tx, rates));
  }
  const amount = Number(tx.accountAmount || tx.amount || 0);
  const sourceCurrency = tx.accountAmount && tx.accountCurrency
    ? tx.accountCurrency
    : (tx.currency || resolveAccountCurrency(accounts, tx.accountId, targetCurrency));
  return convertCurrency(amount, sourceCurrency, targetCurrency, getRecordRates(tx, rates));
}

export function sumAccountTransactionsInCurrency(transactions = [], accounts = [], accountId = '', type = 'income', targetCurrency = 'LKR', rates) {
  return transactions
    .filter((tx) => tx.type === type && tx.accountId === accountId)
    .reduce((sum, tx) => sum + getTransactionAmountInCurrency(tx, accounts, targetCurrency, rates, accountId), 0);
}

export function resolveAccountCurrency(accounts, accountId, fallbackCurrency = 'LKR') {
  return accounts.find((account) => account.id === accountId)?.currency || fallbackCurrency || 'LKR';
}

export function getTransactionCurrency(tx, accounts, fallbackCurrency = 'LKR', activeAccountId = '') {
  if (!tx) return fallbackCurrency || 'LKR';
  if (activeAccountId && activeAccountId !== 'All') return resolveAccountCurrency(accounts, activeAccountId, fallbackCurrency);
  if (tx.type === 'transfer') return tx.currency || resolveAccountCurrency(accounts, tx.fromAccountId || tx.toAccountId, fallbackCurrency);
  return tx.currency || resolveAccountCurrency(accounts, tx.accountId, fallbackCurrency);
}

export function sumTransactionsInCurrency(transactions, accounts, type, targetCurrency = 'LKR', rates) {
  return transactions
    .filter((tx) => tx.type === type)
    .reduce((sum, tx) => sum + getTransactionAmountInCurrency(tx, accounts, targetCurrency, rates), 0);
}

export function buildHomeTotalsView({ totals, accounts, transactions, filter = 'All', fallbackCurrency = 'LKR', rates }) {
  if (!filter || filter === 'All') {
    const convertedTotals = buildConvertedAllTotals(accounts, transactions, fallbackCurrency, rates);
    return {
      ...totals,
      ...convertedTotals,
      currency: fallbackCurrency,
      label: 'Total Balance',
      mode: 'all'
    };
  }

  const account = accounts.find((item) => item.id === filter);
  if (!account) {
    return {
      ...totals,
      currency: fallbackCurrency,
      label: 'Total Balance',
      mode: 'all'
    };
  }

  const accountCurrency = account.currency || fallbackCurrency || 'LKR';
  const income = sumAccountTransactionsInCurrency(transactions, accounts, account.id, 'income', accountCurrency, rates);
  const expenses = sumAccountTransactionsInCurrency(transactions, accounts, account.id, 'expense', accountCurrency, rates);

  return {
    income,
    expenses,
    balance: Number(account.balance || 0),
    savings: income - expenses,
    currency: accountCurrency,
    label: account.hideFromTotal ? 'Hidden Account Balance' : 'Account Balance',
    mode: 'account',
    accountName: account.name,
    hiddenFromTotal: !!account.hideFromTotal
  };
}

export function buildConvertedAllTotals(accounts, transactions, fallbackCurrency = 'LKR', rates) {
  const visibleTransactions = visibleTransactionsForAccountFilter(transactions, accounts, 'All');
  const income = sumTransactionsInCurrency(visibleTransactions, accounts, 'income', fallbackCurrency, rates);
  const expenses = sumTransactionsInCurrency(visibleTransactions, accounts, 'expense', fallbackCurrency, rates);
  // Balance is current money still held in accounts, so convert it with latest/manual rates.
  // Income/expense history above still uses each transaction's saved rate snapshot.
  const balance = buildCurrentBalanceTotal(accounts, fallbackCurrency, rates);
  return { income, expenses, balance, savings: income - expenses };
}
