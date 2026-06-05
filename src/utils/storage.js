export const STORE_KEY = 'cashnest_x_vite_jsx_state_v1';

export const DEFAULT_CASH_ACCOUNT = {
  id: 'cash-wallet-default',
  name: 'Cash Wallet',
  type: 'Cash Wallet',
  openingBalance: 0,
  balance: 0,
  color: 'amber',
  icon: 'ti-wallet',
  currency: 'LKR',
  hideFromTotal: false,
  isDefault: true
};

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function withDefaultCashAccount(accounts = [], currency = 'LKR') {
  const list = safeArray(accounts).filter((account) => account && typeof account === 'object').map((account) => ({ ...account }));
  const existingIndex = list.findIndex((account) => account.isDefault || account.id === DEFAULT_CASH_ACCOUNT.id || (account.name === 'Cash Wallet' && account.type === 'Cash Wallet'));
  if (existingIndex >= 0) {
    list[existingIndex] = { ...DEFAULT_CASH_ACCOUNT, currency, ...list[existingIndex], isDefault: true, id: list[existingIndex].id || DEFAULT_CASH_ACCOUNT.id };
    return list;
  }
  return [{ ...DEFAULT_CASH_ACCOUNT, currency }, ...list];
}

export function loadLedgerState(defaultState) {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return { ...defaultState, accounts: withDefaultCashAccount(defaultState.accounts || [], defaultState.currency || 'LKR') };
    const saved = JSON.parse(raw);
    if (saved && typeof saved === 'object' && !Array.isArray(saved)) {
      const savedAccounts = safeArray(saved.accounts);
      const savedTransactions = safeArray(saved.transactions);
      const hasRealData = Boolean(
        savedTransactions.length ||
        safeArray(saved.loans).length ||
        safeArray(saved.budgets).length ||
        savedAccounts.some((account) => Number(account?.openingBalance || account?.balance || 0) !== 0)
      );
      return {
        ...defaultState,
        ...saved,
        accounts: withDefaultCashAccount(savedAccounts.length ? savedAccounts : defaultState.accounts || [], saved.currency || defaultState.currency || 'LKR'),
        transactions: savedTransactions,
        loans: safeArray(saved.loans),
        budgets: safeArray(saved.budgets),
        customCategories: safeArray(saved.customCategories),
        notifications: safeArray(saved.notifications),
        archivedNotifications: safeArray(saved.archivedNotifications),
        currency: saved.currency || defaultState.currency || 'LKR',
        userName: saved.userName || defaultState.userName || '',
        onboardingComplete: Boolean(saved.onboardingComplete ?? hasRealData),
        googleBackup: {
          ...(defaultState.googleBackup || {}),
          ...((saved.googleBackup && typeof saved.googleBackup === 'object') ? saved.googleBackup : {})
        },
        preferences: {
          ...(defaultState.preferences || {}),
          ...((saved.preferences && typeof saved.preferences === 'object') ? saved.preferences : {})
        }
      };
    }
  } catch (error) {
    console.warn('LocalStorage load failed, starting with safe defaults:', error);
  }
  return { ...defaultState, accounts: withDefaultCashAccount(defaultState.accounts || [], defaultState.currency || 'LKR') };
}

export function saveLedgerState(state) {
  try {
    const safeState = {
      ...state,
      accounts: safeArray(state?.accounts),
      transactions: safeArray(state?.transactions),
      loans: safeArray(state?.loans),
      budgets: safeArray(state?.budgets),
      customCategories: safeArray(state?.customCategories),
      notifications: safeArray(state?.notifications),
      archivedNotifications: safeArray(state?.archivedNotifications)
    };
    localStorage.setItem(STORE_KEY, JSON.stringify(safeState));
  } catch (error) {
    console.warn('LocalStorage save failed:', error);
  }
}
