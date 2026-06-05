import { defaultState } from '../models/defaultState';
import { GOOGLE_BACKUP_ENABLED } from '../config/appConfig';
import { todayInputValue, formatCalendarDate } from '../modals/DateCalendarModal';

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function safeObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function safeNumber(value, fallback = 0) {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}


function normalizeGoogleBackupStatus(googleBackup = {}, signedIn = false) {
  const backup = safeObject(googleBackup);
  if (!GOOGLE_BACKUP_ENABLED) {
    return { ...backup, status: 'disabled', error: '' };
  }
  const busyStatuses = new Set(['checking', 'uploading', 'restoring']);
  if (!busyStatuses.has(String(backup.status || '').toLowerCase())) return backup;
  return {
    ...backup,
    status: signedIn ? 'ready' : 'signed-out',
    error: ''
  };
}

export function migrateLedgerState(raw = {}) {
  try {
    const source = safeObject(raw);
    const mainCurrency = typeof source.currency === 'string' && source.currency ? source.currency : defaultState.currency || 'LKR';
    const rawAccounts = safeArray(source.accounts).length ? safeArray(source.accounts) : safeArray(defaultState.accounts);
    const accounts = rawAccounts.map((item, index) => {
      const account = safeObject(item);
      const isDefault = !!account.isDefault || account.id === 'cash-wallet-default' || (index === 0 && (!account.name || account.name === 'Cash Wallet'));
      return {
        ...account,
        id: account.id || (isDefault ? 'cash-wallet-default' : `account-${index}`),
        name: account.name || (isDefault ? 'Cash Wallet' : 'Account'),
        type: account.type || 'Cash Wallet',
        openingBalance: safeNumber(account.openingBalance, 0),
        balance: safeNumber(account.balance ?? account.openingBalance, 0),
        balanceCorrectionDateValue: account.balanceCorrectionDateValue || account.createdDateValue || '',
        createdAt: account.createdAt || null,
        updatedAt: account.updatedAt || null,
        currency: account.currency || mainCurrency,
        hideFromTotal: !!account.hideFromTotal,
        icon: account.icon || 'ti-wallet',
        color: account.color || (isDefault ? 'amber' : 'accent'),
        isDefault
      };
    });
    const finalAccounts = accounts.length ? accounts : [{ ...defaultState.accounts[0], currency: mainCurrency }];
    const accountById = Object.fromEntries(finalAccounts.map((account) => [account.id, account]));
    const transactions = safeArray(source.transactions).map((item) => {
      const tx = safeObject(item);
      const account = accountById[tx.accountId] || accountById[tx.fromAccountId] || accountById[tx.toAccountId] || finalAccounts[0];
      const fromAccount = accountById[tx.fromAccountId];
      const toAccount = accountById[tx.toAccountId];
      const type = ['income', 'expense', 'transfer'].includes(tx.type) ? tx.type : 'expense';
      const dateValue = tx.dateValue || todayInputValue();
      return {
        ...tx,
        id: tx.id || `tx-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        type,
        amount: safeNumber(tx.amount, 0),
        toAmount: type === 'transfer' ? safeNumber(tx.toAmount ?? tx.amount, 0) : tx.toAmount,
        accountId: type === 'transfer' ? '' : (tx.accountId || account?.id || ''),
        accountName: tx.accountName || account?.name || 'Cash Wallet',
        fromAccountId: type === 'transfer' ? (tx.fromAccountId || fromAccount?.id || finalAccounts[0]?.id || '') : tx.fromAccountId,
        toAccountId: type === 'transfer' ? (tx.toAccountId || toAccount?.id || finalAccounts[0]?.id || '') : tx.toAccountId,
        currency: tx.currency || (type === 'transfer' ? fromAccount?.currency || toAccount?.currency : account?.currency) || mainCurrency,
        toCurrency: tx.toCurrency || (type === 'transfer' ? toAccount?.currency : undefined),
        dateValue,
        date: tx.date || formatCalendarDate(dateValue),
        category: tx.category || (type === 'income' ? 'Income' : type === 'transfer' ? 'Transfer' : 'General'),
        title: tx.title || (type === 'income' ? 'New Income' : type === 'transfer' ? 'Account Transfer' : 'Expense')
      };
    });
    const loans = safeArray(source.loans).map((item) => {
      const loan = safeObject(item);
      return {
        ...loan,
        id: loan.id || `loan-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        person: loan.person || 'Loan',
        type: loan.type || 'Lending',
        amount: safeNumber(loan.amount, 0),
        paid: safeNumber(loan.paid, 0),
        currency: loan.currency || mainCurrency,
        payments: safeArray(loan.payments).map((payment) => ({ ...safeObject(payment), amount: safeNumber(safeObject(payment).amount, 0), accountId: safeObject(payment).accountId || '', currency: safeObject(payment).currency || loan.currency || mainCurrency }))
      };
    });
    const budgets = safeArray(source.budgets).map((item) => {
      const budget = safeObject(item);
      return { ...budget, id: budget.id || `budget-${Date.now()}-${Math.random().toString(16).slice(2)}`, name: budget.name || `${budget.category || 'General'} Budget`, amount: safeNumber(budget.amount, 0), currency: budget.currency || mainCurrency };
    });
    const customCategories = safeArray(source.customCategories).filter((cat) => cat && typeof cat === 'object');
    const notifications = safeArray(source.notifications).filter((item) => item && typeof item === 'object');
    const archivedNotifications = safeArray(source.archivedNotifications).filter((item) => item && typeof item === 'object');
    const hasRealData = Boolean(
      transactions.length || loans.length || budgets.length || finalAccounts.some((account) => safeNumber(account.openingBalance || account.balance, 0) !== 0)
    );
    const sourcePreferences = safeObject(source.preferences);
    const {
      bankSmsAutoSync,
      bankSmsLastSyncAt,
      bankSmsLastImportCount,
      bankSmsLastScannedCount,
      bankSmsPermissionMessage,
      bankSmsImportedHashes,
      ...restoredPreferences
    } = sourcePreferences;
    const signedIn = GOOGLE_BACKUP_ENABLED && Boolean(source.signedIn);
    const normalizedGoogleBackup = normalizeGoogleBackupStatus(source.googleBackup, signedIn);

    return {
      ...defaultState,
      ...source,
      currency: mainCurrency,
      accounts: finalAccounts,
      transactions,
      loans,
      budgets,
      customCategories,
      notifications,
      archivedNotifications,
      signedIn,
      googleUser: signedIn ? safeObject(source.googleUser) : null,
      googleAccessToken: signedIn ? (source.googleAccessToken || '') : '',
      googleIdToken: signedIn ? (source.googleIdToken || '') : '',
      googleRefreshToken: signedIn ? (source.googleRefreshToken || '') : '',
      firebaseUid: signedIn ? (source.firebaseUid || source.googleUser?.firebaseUid || '') : '',
      googleBackup: { ...(defaultState.googleBackup || {}), ...normalizedGoogleBackup },
      localBackup: { ...(defaultState.localBackup || {}), ...safeObject(source.localBackup) },
      cloudBackups: {
        cloudflare: { ...(defaultState.cloudBackups?.cloudflare || {}), ...safeObject(source.cloudBackups?.cloudflare) }
      },
      onboardingComplete: Boolean(source.onboardingComplete ?? hasRealData),
      preferences: {
        ...(defaultState.preferences || {}),
        ...restoredPreferences,
        compactNumbers: !!sourcePreferences.compactNumbers,
        autoGoogleBackup: GOOGLE_BACKUP_ENABLED && sourcePreferences.autoGoogleBackup === true,
        autoLocalBackup: sourcePreferences.autoLocalBackup === true,
        selectedCloudBackupProvider: 'cloudflare',
        autoCloudBackupEnabled: false,
        autoCloudBackupProvider: '',
        disabledCategories: safeArray(sourcePreferences.disabledCategories).map((item) => String(item || '')).filter(Boolean)
      }
    };
  } catch (error) {
    console.warn('CashNest X migration failed, loading safe defaults:', error);
    return { ...defaultState, accounts: Array.isArray(defaultState.accounts) ? defaultState.accounts : [] };
  }
}
