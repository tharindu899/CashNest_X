export function getAccountById(accounts = [], accountId = '') {
  return accounts.find((account) => account.id === accountId);
}

export function isAccountHidden(accounts = [], accountId = '') {
  if (!accountId) return false;
  return !!getAccountById(accounts, accountId)?.hideFromTotal;
}

export function transactionTouchesAccount(tx, accountId = '') {
  if (!tx || !accountId || accountId === 'All') return false;
  return tx.accountId === accountId || tx.fromAccountId === accountId || tx.toAccountId === accountId;
}

export function transactionTouchesHiddenAccount(tx, accounts = []) {
  if (!tx) return false;
  return [tx.accountId, tx.fromAccountId, tx.toAccountId].some((accountId) => isAccountHidden(accounts, accountId));
}

export function isTransactionVisibleForAccountFilter(tx, accounts = [], accountFilter = 'All') {
  if (!tx) return false;
  if (!accountFilter || accountFilter === 'All') return !transactionTouchesHiddenAccount(tx, accounts);
  return transactionTouchesAccount(tx, accountFilter);
}

export function visibleTransactionsForAccountFilter(transactions = [], accounts = [], accountFilter = 'All') {
  return transactions.filter((tx) => isTransactionVisibleForAccountFilter(tx, accounts, accountFilter));
}
