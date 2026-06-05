import { convertCurrency } from './currencyConverter';
import { getTransactionAmountInCurrency, getTransactionCurrency, sumTransactionsInCurrency } from './accountViewTotals';
import { visibleTransactionsForAccountFilter } from './transactionFilters';

function normalizeAmount(value) {
  const amount = Number(value || 0);
  return Number.isFinite(amount) ? amount : 0;
}

function normalizeText(value = '') {
  return String(value || '').trim().toLowerCase().replace(/[\s_-]+/g, ' ');
}

function getLoanKindFromTransaction(tx = {}, linkedLoan = null) {
  if (linkedLoan?.type) return linkedLoan.type;
  const loanKind = String(tx.loanKind || tx.loanType || '').trim();
  if (loanKind === 'Lending' || loanKind === 'Borrowing') return loanKind;

  const category = normalizeText(tx.category);
  const title = normalizeText(tx.title);
  const nature = normalizeText(tx.transactionNature || tx.nature);
  const type = normalizeText(tx.type);

  if (category.includes('loan received') || title.startsWith('loan from') || title.includes('borrowed') || nature.includes('borrow')) return 'Borrowing';
  if (category.includes('loan given') || title.startsWith('loan to') || title.includes('lent') || nature.includes('lend')) return 'Lending';

  // Older broken records sometimes kept only income/expense with a loanId.
  if (nature === 'loan' || tx.loanId) {
    if (type === 'income') return 'Borrowing';
    if (type === 'expense') return 'Lending';
  }

  return '';
}

function isBaseLoanTransaction(tx = {}) {
  const category = normalizeText(tx.category);
  const nature = normalizeText(tx.transactionNature || tx.nature);
  const title = normalizeText(tx.title);
  const type = normalizeText(tx.type);
  return nature === 'loan'
    || type === 'loan'
    || category.includes('loan given')
    || category.includes('loan received')
    || title.startsWith('loan to')
    || title.startsWith('loan from');
}

function isLoanPaymentTransaction(tx = {}) {
  const category = normalizeText(tx.category);
  const nature = normalizeText(tx.transactionNature || tx.nature);
  const title = normalizeText(tx.title);
  return nature === 'loan payment'
    || nature === 'loan-payment'
    || !!tx.loanPaymentId
    || category.includes('loan repayment')
    || category.includes('loan payment received')
    || title.startsWith('payment to')
    || title.startsWith('payment from');
}

function hasLinkedLoanTransaction(transactions = [], loanId = '', nature = 'loan') {
  if (!loanId) return false;
  const expectedNature = normalizeText(nature);
  return transactions.some((tx) => {
    if (tx?.loanId !== loanId) return false;
    return expectedNature === 'loan payment' || expectedNature === 'loan-payment'
      ? isLoanPaymentTransaction(tx)
      : isBaseLoanTransaction(tx);
  });
}

function hasLinkedLoanPaymentTransaction(transactions = [], loanId = '', paymentId = '') {
  if (!loanId) return false;
  return transactions.some((tx) => {
    if (tx?.loanId !== loanId) return false;
    if (paymentId && tx.loanPaymentId === paymentId) return true;
    return isLoanPaymentTransaction(tx) && !paymentId;
  });
}

function loanBaseToAnalyticsTransaction(loan = {}) {
  const isBorrowing = loan.type === 'Borrowing';
  const amount = normalizeAmount(loan.amount);
  if (!amount) return null;
  return {
    id: `analytics-loan-${loan.id || loan.person || loan.createdAt || loan.dateValue || 'unknown'}`,
    type: isBorrowing ? 'income' : 'expense',
    amount,
    category: isBorrowing ? 'Loan Received' : 'Loan Given',
    title: isBorrowing ? `Loan from ${loan.person || 'Loan Person'}` : `Loan to ${loan.person || 'Loan Person'}`,
    accountId: loan.accountId || '',
    accountName: loan.accountName || '',
    dateValue: loan.dateValue || (loan.createdAt ? new Date(loan.createdAt).toISOString().slice(0, 10) : ''),
    createdAt: loan.createdAt || Date.now(),
    currency: loan.currency || '',
    loanId: loan.id || '',
    loanKind: loan.type || '',
    loanPerson: loan.person || '',
    transactionNature: 'loan',
    isAnalyticsVirtualLoan: true
  };
}

function loanPaymentToAnalyticsTransaction(loan = {}, payment = {}) {
  const isBorrowing = loan.type === 'Borrowing';
  const loanAmount = normalizeAmount(payment.amount);
  if (!loanAmount) return null;
  return {
    id: `analytics-loan-payment-${loan.id || 'loan'}-${payment.id || payment.dateValue || payment.createdAt || 'unknown'}`,
    type: isBorrowing ? 'expense' : 'income',
    amount: normalizeAmount(payment.accountAmount) || loanAmount,
    category: isBorrowing ? 'Loan Repayment' : 'Loan Payment Received',
    title: isBorrowing ? `Payment to ${loan.person || 'Loan Person'}` : `Payment from ${loan.person || 'Loan Person'}`,
    accountId: payment.accountId || loan.accountId || '',
    accountName: payment.accountName || loan.accountName || '',
    dateValue: payment.dateValue || loan.dateValue || '',
    createdAt: payment.createdAt || loan.createdAt || Date.now(),
    currency: payment.accountCurrency || payment.currency || loan.currency || '',
    loanAmount,
    loanCurrency: payment.currency || loan.currency || '',
    accountAmount: normalizeAmount(payment.accountAmount) || loanAmount,
    accountCurrency: payment.accountCurrency || payment.currency || loan.currency || '',
    exchangeRates: payment.exchangeRates || loan.exchangeRates || null,
    loanId: loan.id || '',
    loanPaymentId: payment.id || '',
    loanKind: loan.type || '',
    loanPerson: loan.person || '',
    transactionNature: 'loan-payment',
    isAnalyticsVirtualLoan: true
  };
}

function normalizeLoanLikeTransactionForAnalytics(tx = {}, loans = []) {
  if (!tx) return tx;
  const linkedLoan = tx.loanId ? (loans || []).find((loan) => loan?.id === tx.loanId) : null;
  const isBaseLoan = isBaseLoanTransaction(tx);
  const isPayment = isLoanPaymentTransaction(tx);

  if (!isBaseLoan && !isPayment) return tx;

  const loanKind = getLoanKindFromTransaction(tx, linkedLoan) || (isPayment ? 'Borrowing' : 'Lending');
  const isBorrowing = loanKind === 'Borrowing';
  const next = { ...tx };

  if (isBaseLoan) {
    next.type = isBorrowing ? 'income' : 'expense';
    next.category = isBorrowing ? 'Loan Received' : 'Loan Given';
    next.transactionNature = 'loan';
    next.loanKind = loanKind;
    if ((!Number(next.amount) || Number(next.amount) <= 0) && linkedLoan?.amount) next.amount = Number(linkedLoan.amount || 0);
    if (!next.dateValue && linkedLoan?.dateValue) next.dateValue = linkedLoan.dateValue;
    if (!next.currency && linkedLoan?.currency) next.currency = linkedLoan.currency;
    if (!next.accountId && linkedLoan?.accountId) next.accountId = linkedLoan.accountId;
    if (!next.title) next.title = isBorrowing ? `Loan from ${linkedLoan?.person || next.loanPerson || 'Loan Person'}` : `Loan to ${linkedLoan?.person || next.loanPerson || 'Loan Person'}`;
    return next;
  }

  next.type = isBorrowing ? 'expense' : 'income';
  next.category = isBorrowing ? 'Loan Repayment' : 'Loan Payment Received';
  next.transactionNature = 'loan-payment';
  next.loanKind = loanKind;
  if (!next.dateValue && linkedLoan?.dateValue) next.dateValue = linkedLoan.dateValue;
  if (!next.currency && linkedLoan?.currency) next.currency = linkedLoan.currency;
  if (!next.accountId && linkedLoan?.accountId) next.accountId = linkedLoan.accountId;
  if (!next.title) next.title = isBorrowing ? `Payment to ${linkedLoan?.person || next.loanPerson || 'Loan Person'}` : `Payment from ${linkedLoan?.person || next.loanPerson || 'Loan Person'}`;
  return next;
}

function toDateValue(value, fallback = '') {
  if (!value) return fallback || new Date().toISOString().slice(0, 10);
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback || new Date().toISOString().slice(0, 10);
  return date.toISOString().slice(0, 10);
}

function hasLinkedBalanceCorrection(transactions = [], accountId = '') {
  if (!accountId) return false;
  return transactions.some((tx) => {
    if (tx?.accountId !== accountId) return false;
    const nature = normalizeText(tx.transactionNature || tx.nature);
    const category = normalizeText(tx.category);
    return nature === 'balance correction' || nature === 'balance-correction' || category.includes('balance correction');
  });
}

function accountOpeningBalanceToAnalyticsTransaction(account = {}) {
  const amount = normalizeAmount(account.openingBalance ?? account.initialBalance ?? 0);
  if (!amount) return null;
  const correctionDate = toDateValue(account.balanceCorrectionDateValue || account.createdDateValue || account.createdAt || account.updatedAt);
  const isPositive = amount >= 0;
  return {
    id: `analytics-balance-correction-${account.id || account.name || correctionDate}`,
    type: isPositive ? 'income' : 'expense',
    amount: Math.abs(amount),
    category: 'Balance Correction',
    title: `${isPositive ? 'Balance added' : 'Balance reduced'} • ${account.name || 'Account'}`,
    accountId: account.id || '',
    accountName: account.name || 'Account',
    dateValue: correctionDate,
    createdAt: account.createdAt || account.updatedAt || Date.now(),
    currency: account.currency || '',
    transactionNature: 'balance-correction',
    isAnalyticsVirtualBalanceCorrection: true
  };
}

export function buildBalanceCorrectionAnalyticsTransactions(transactions = [], accounts = []) {
  const txList = Array.isArray(transactions) ? transactions : [];
  const virtualCorrections = [];
  (Array.isArray(accounts) ? accounts : []).forEach((account) => {
    if (!account) return;
    if (hasLinkedBalanceCorrection(txList, account.id)) return;
    const virtualTx = accountOpeningBalanceToAnalyticsTransaction(account);
    if (virtualTx) virtualCorrections.push(virtualTx);
  });
  return virtualCorrections;
}

export function buildLoanAwareAnalyticsTransactions(transactions = [], loans = [], accounts = []) {
  const safeLoans = Array.isArray(loans) ? loans : [];
  const txList = (Array.isArray(transactions) ? transactions : []).map((tx) => normalizeLoanLikeTransactionForAnalytics(tx, safeLoans));
  const analyticsTransactions = [
    ...txList,
    ...buildBalanceCorrectionAnalyticsTransactions(txList, accounts)
  ];
  safeLoans.forEach((loan) => {
    if (!loan) return;
    if (!hasLinkedLoanTransaction(txList, loan.id, 'loan')) {
      const virtualLoanTx = loanBaseToAnalyticsTransaction(loan);
      if (virtualLoanTx) analyticsTransactions.push(virtualLoanTx);
    }
    (Array.isArray(loan.payments) ? loan.payments : []).forEach((payment) => {
      if (!hasLinkedLoanPaymentTransaction(txList, loan.id, payment?.id || '')) {
        const virtualPaymentTx = loanPaymentToAnalyticsTransaction(loan, payment);
        if (virtualPaymentTx) analyticsTransactions.push(virtualPaymentTx);
      }
    });
  });
  return analyticsTransactions;
}

export function getAnalyticsDate(tx) {
  if (tx?.dateValue) return new Date(`${tx.dateValue}T00:00:00`);
  if (tx?.createdAt) return new Date(tx.createdAt);
  return new Date();
}

export function getAnalyticsMonthKey(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function getVisibleAnalyticsTransactions(transactions = [], accounts = []) {
  return visibleTransactionsForAccountFilter(transactions, accounts, 'All');
}

export function getMonthTransactions(transactions = [], accounts = [], selectedMonth = '') {
  return getVisibleAnalyticsTransactions(transactions, accounts).filter((tx) => getAnalyticsMonthKey(getAnalyticsDate(tx)) === selectedMonth);
}

export function getConvertedTransactionAmount(tx, accounts = [], targetCurrency = 'LKR', rates) {
  return getTransactionAmountInCurrency(tx, accounts, targetCurrency, rates);
}

export function sumConvertedByType(transactions = [], accounts = [], type = 'income', targetCurrency = 'LKR', rates) {
  return sumTransactionsInCurrency(transactions, accounts, type, targetCurrency, rates);
}

export function buildCategoryTotals(transactions = [], accounts = [], targetCurrency = 'LKR', rates, type = 'expense') {
  return transactions
    .filter((tx) => tx.type === type)
    .reduce((map, tx) => {
      const category = tx.category || (type === 'income' ? 'Income' : 'Other');
      const amount = getConvertedTransactionAmount(tx, accounts, targetCurrency, rates);
      return { ...map, [category]: (map[category] || 0) + amount };
    }, {});
}

export function buildMonthlyExpenseTotals(transactions = [], accounts = [], monthKeys = [], targetCurrency = 'LKR', rates) {
  return buildMonthlyIncomeExpenseTotals(transactions, accounts, monthKeys, targetCurrency, rates)
    .map((item) => ({ ...item, total: item.expense }));
}

export function buildMonthlyIncomeExpenseTotals(transactions = [], accounts = [], monthKeys = [], targetCurrency = 'LKR', rates) {
  const visibleTransactions = getVisibleAnalyticsTransactions(transactions, accounts);
  return monthKeys.map((item) => {
    const monthTransactions = visibleTransactions.filter((tx) => getAnalyticsMonthKey(getAnalyticsDate(tx)) === item.key);
    const income = monthTransactions
      .filter((tx) => tx.type === 'income')
      .reduce((sum, tx) => sum + getConvertedTransactionAmount(tx, accounts, targetCurrency, rates), 0);
    const expense = monthTransactions
      .filter((tx) => tx.type === 'expense')
      .reduce((sum, tx) => sum + getConvertedTransactionAmount(tx, accounts, targetCurrency, rates), 0);
    return { ...item, income, expense, total: income + expense };
  });
}

export function getConvertedBudgetSpent(transactions = [], accounts = [], budgetCategory = '', selectedMonth = '', targetCurrency = 'LKR', rates) {
  return getVisibleAnalyticsTransactions(transactions, accounts)
    .filter((tx) => tx.type === 'expense' && tx.category === budgetCategory && getAnalyticsMonthKey(getAnalyticsDate(tx)) === selectedMonth)
    .reduce((sum, tx) => sum + getConvertedTransactionAmount(tx, accounts, targetCurrency, rates), 0);
}
