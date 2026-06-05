
export function isLoanPaymentTransaction(tx = {}) {
  const nature = String(tx.transactionNature || '').toLowerCase();
  const category = String(tx.category || '').toLowerCase();
  const title = String(tx.title || '').toLowerCase();
  return nature === 'loan-payment'
    || !!tx.loanPaymentId
    || category === 'loan payment received'
    || category === 'loan repayment'
    || title.startsWith('payment from ')
    || title.startsWith('payment to ');
}

export function isLoanLedgerTransaction(tx = {}) {
  const category = String(tx.category || '').toLowerCase();
  const title = String(tx.title || '').toLowerCase();
  return tx.transactionNature === 'loan'
    || isLoanPaymentTransaction(tx)
    || !!tx.loanId
    || category === 'loan given'
    || category === 'loan received'
    || title.startsWith('loan to ')
    || title.startsWith('loan from ');
}

export function getLoanKindFromTransaction(tx = {}) {
  if (tx.loanKind) return tx.loanKind;
  const category = String(tx.category || '').toLowerCase();
  const title = String(tx.title || '').toLowerCase();
  if (category === 'loan received' || title.startsWith('loan from ') || tx.type === 'income') return 'Borrowing';
  return 'Lending';
}

export function getLoanPersonFromTransaction(tx = {}) {
  if (tx.loanPerson) return tx.loanPerson;
  const title = String(tx.title || '').trim();
  const toMatch = title.match(/^loan\s+to\s+(.+)$/i);
  if (toMatch?.[1]) return toMatch[1].trim();
  const fromMatch = title.match(/^loan\s+from\s+(.+)$/i);
  if (fromMatch?.[1]) return fromMatch[1].trim();
  const noteMatch = String(tx.note || '').match(/(?:Lending|Borrowing)\s+-\s+(.+)$/i);
  return noteMatch?.[1]?.trim() || '';
}

export function getLoanTransactionTypeLabel(tx = {}) {
  if (isLoanPaymentTransaction(tx)) return getLoanKindFromTransaction(tx) === 'Borrowing' ? 'Loan Repayment' : 'Loan Payment Received';
  return getLoanKindFromTransaction(tx) === 'Borrowing' ? 'Loan Received' : 'Loan Given';
}

export function getLoanTransactionMeta(tx = {}) {
  const kind = getLoanKindFromTransaction(tx);
  const person = getLoanPersonFromTransaction(tx) || 'Loan Person';
  const account = tx.accountName || 'Account';
  return `${kind} • ${person} • ${account}`;
}

export function findLoanForTransaction(tx = {}, loans = [], accounts = [], appCurrency = 'LKR') {
  if (!isLoanLedgerTransaction(tx)) return null;
  if (tx.loanId) {
    const byId = loans.find((loan) => loan.id === tx.loanId);
    if (byId) return byId;
  }

  const person = getLoanPersonFromTransaction(tx).toLowerCase();
  const kind = getLoanKindFromTransaction(tx);
  const txAccount = accounts.find((account) => account.id === tx.accountId);
  const txCurrency = tx.currency || txAccount?.currency || appCurrency || 'LKR';
  const amount = Number(tx.amount || 0);
  const dateValue = tx.dateValue || '';

  const candidates = loans.filter((loan) => {
    if (kind && loan.type !== kind) return false;
    if (person && String(loan.person || '').toLowerCase() !== person) return false;
    if (amount && Number(loan.amount || 0) !== amount) return false;
    if ((loan.currency || appCurrency || 'LKR') !== txCurrency) return false;
    return true;
  });

  if (!candidates.length) return null;
  return candidates.find((loan) => loan.dateValue === dateValue) || candidates[0];
}
