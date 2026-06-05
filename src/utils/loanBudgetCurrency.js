import { formatMoneyForCurrency } from './currency';
import { convertCurrency } from './currencyConverter';
import { getConvertedTransactionAmount } from './analyticsCurrencyTotals';
import { visibleTransactionsForAccountFilter } from './transactionFilters';

export function resolveLoanCurrency(loan = {}, fallbackCurrency = 'LKR') {
  return loan.currency || fallbackCurrency || 'LKR';
}

export function convertLoanAmount(loan = {}, field = 'amount', targetCurrency = 'LKR', rates) {
  return convertCurrency(Number(loan?.[field] || 0), resolveLoanCurrency(loan, targetCurrency), targetCurrency, rates);
}

export function sumLoansInCurrency(loans = [], type = 'Lending', targetCurrency = 'LKR', rates) {
  return loans
    .filter((loan) => !type || loan.type === type)
    .reduce((sum, loan) => sum + convertLoanAmount(loan, 'amount', targetCurrency, rates), 0);
}

export function formatLoanAmount(loan = {}, field = 'amount', fallbackCurrency = 'LKR', options = {}) {
  return formatMoneyForCurrency(Number(loan?.[field] || 0), resolveLoanCurrency(loan, fallbackCurrency), options);
}

export function formatConvertedLoanAmount(loan = {}, field = 'amount', targetCurrency = 'LKR', rates, options = {}) {
  return formatMoneyForCurrency(convertLoanAmount(loan, field, targetCurrency, rates), targetCurrency, options);
}

export function shouldShowLoanConvertedLine(loan = {}, targetCurrency = 'LKR') {
  return resolveLoanCurrency(loan, targetCurrency) !== (targetCurrency || 'LKR');
}

export function getBudgetSpentInCurrency({ transactions = [], accounts = [], category = '', targetCurrency = 'LKR', rates, includeHidden = false }) {
  const sourceTransactions = includeHidden ? transactions : visibleTransactionsForAccountFilter(transactions, accounts, 'All');
  return sourceTransactions
    .filter((tx) => tx.type === 'expense' && tx.category === category)
    .reduce((sum, tx) => sum + getConvertedTransactionAmount(tx, accounts, targetCurrency, rates), 0);
}

export function convertBudgetLimit(budget = {}, targetCurrency = 'LKR', rates) {
  return convertCurrency(Number(budget.amount || 0), budget.currency || targetCurrency || 'LKR', targetCurrency || 'LKR', rates);
}

export function sumBudgetLimitsInCurrency(budgets = [], targetCurrency = 'LKR', rates) {
  return budgets.reduce((sum, budget) => sum + convertBudgetLimit(budget, targetCurrency, rates), 0);
}
