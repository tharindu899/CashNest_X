function normalizeAmount(value) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number : 0;
}

function toDateValue(value, fallback = '') {
  if (!value) return fallback || new Date().toISOString().slice(0, 10);
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback || new Date().toISOString().slice(0, 10);
  return date.toISOString().slice(0, 10);
}

function normalizeText(value) {
  return String(value || '').trim().toLowerCase();
}

function isBalanceCorrectionTransaction(tx = {}) {
  const nature = normalizeText(tx.transactionNature || tx.nature);
  const category = normalizeText(tx.category);
  const title = normalizeText(tx.title);
  return nature === 'balance correction'
    || nature === 'balance-correction'
    || category.includes('balance correction')
    || title.includes('opening balance');
}

export function hasRecordBalanceCorrection(transactions = [], accountId = '') {
  if (!accountId) return false;
  return (Array.isArray(transactions) ? transactions : []).some((tx) => tx?.accountId === accountId && isBalanceCorrectionTransaction(tx));
}

export function accountOpeningBalanceToRecordTransaction(account = {}) {
  const amount = normalizeAmount(account.openingBalance ?? account.initialBalance ?? 0);
  if (!amount) return null;
  const currency = account.currency || 'LKR';
  const dateValue = toDateValue(account.balanceCorrectionDateValue || account.createdDateValue || account.createdAt || account.updatedAt);
  const isPositive = amount >= 0;
  return {
    id: `record-opening-balance-${account.id || account.name || dateValue}`,
    type: isPositive ? 'income' : 'expense',
    title: 'Opening Balance',
    amount: Math.abs(amount),
    accountAmount: Math.abs(amount),
    currency,
    accountCurrency: currency,
    category: 'Balance Correction',
    icon: 'ti-adjustments-dollar',
    color: 'accent',
    accountId: account.id || '',
    accountName: account.name || 'Account',
    dateValue,
    date: dateValue,
    createdAt: account.createdAt || account.updatedAt || Date.now(),
    transactionNature: 'balance-correction',
    isVirtualOpeningBalance: true,
    isReadOnlyRecord: true
  };
}

export function buildRecordTransactions(transactions = [], accounts = []) {
  const txList = Array.isArray(transactions) ? transactions : [];
  const virtualOpeningBalances = [];
  (Array.isArray(accounts) ? accounts : []).forEach((account) => {
    if (!account) return;
    if (hasRecordBalanceCorrection(txList, account.id)) return;
    const tx = accountOpeningBalanceToRecordTransaction(account);
    if (tx) virtualOpeningBalances.push(tx);
  });
  return [...txList, ...virtualOpeningBalances];
}
