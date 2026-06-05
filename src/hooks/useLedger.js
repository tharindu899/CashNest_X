import { useEffect, useMemo, useRef, useState } from 'react';
import { defaultState } from '../models/defaultState';
import { allCategories, categoryInfo } from '../models/categories';
import { loadLedgerState, saveLedgerState } from '../utils/storage';
import { uid } from '../utils/format';
import { setStoredCurrencyCode } from '../utils/currency';
import { setCompactNumberPreference } from '../utils/numberFormat';
import { buildConvertedAllTotals } from '../utils/accountViewTotals';
import { playTransactionSound, unlockTransactionSound } from '../utils/sound';
import { createNotification, requestBrowserNotificationPermission, requestNativeNotificationPermission, showMobileNotification, scheduleLoanReminder, cancelLoanReminder } from '../utils/notifications';
import { formatCalendarDate, todayInputValue } from '../modals/DateCalendarModal';
import { getAccentTheme } from '../utils/themeAccent';
import { clearBiometricCredential, createPinSalt, hashPin, setupBiometricCredential, verifyBiometricCredential } from '../utils/lock';
import { exportLedgerData } from '../utils/exportData';
import { saveAutomaticLocalBackup, saveManualLocalBackup, parseLocalBackupFile, localBackupSignature } from '../utils/localBackup';
import { migrateLedgerState } from '../utils/ledgerMigration';
import { getBestCurrencyRates } from '../utils/rateOverrides';
import { getTransferAmounts } from '../utils/transferCurrency';
import { createRecordRateSnapshot, getRecordRates } from '../utils/recordRateSnapshot';
import { buildLoanPaymentTransaction } from '../utils/loanPayments';
import { convertCurrency } from '../utils/currencyConverter';
import { formatLoanReminderTime, normalizeLoanReminderTime } from '../utils/loanReminder';
import { signInWithGoogle, signOutGoogle, refreshFirebaseSession } from '../services/googleAuth';
import { GOOGLE_BACKUP_ENABLED, GOOGLE_DISABLED_MESSAGE } from '../config/appConfig';
import { backupToCloudflareWorker, restoreFromCloudflareWorker } from '../services/cloudBackup';


function addNotificationIfEnabled(prev, notification) {
  const prefs = prev.preferences || {};
  if (prefs.notifications === false) return prev.notifications || [];
  return [createNotification(notification), ...(prev.notifications || [])].slice(0, 60);
}

function normalizeDefaultAccount(account) {
  if (!account) return account;
  const isCashWallet = account.isDefault || account.id === 'cash-wallet-default' || (account.name === 'Cash Wallet' && account.type === 'Cash Wallet');
  return isCashWallet ? { ...account, isDefault: true, icon: account.icon || 'ti-wallet', color: account.color || 'amber', currency: account.currency || 'LKR', hideFromTotal: !!account.hideFromTotal } : { ...account, currency: account.currency || 'LKR', hideFromTotal: !!account.hideFromTotal };
}

function getTransactionRates(tx) {
  return getRecordRates(tx, getBestCurrencyRates());
}

function amountForAccountCurrency(amount, sourceCurrency, accountCurrency, tx) {
  const value = Number(amount || 0);
  if (!Number.isFinite(value) || !value) return 0;
  return convertCurrency(value, sourceCurrency || accountCurrency || 'LKR', accountCurrency || sourceCurrency || 'LKR', getTransactionRates(tx));
}


function getAccountTransactionEffect(accountId, accountCurrency, transactions = []) {
  if (!accountId) return 0;
  return (Array.isArray(transactions) ? transactions : []).reduce((balance, tx) => {
    if (!tx) return balance;
    if (tx.type === 'income' && tx.accountId === accountId) {
      return balance + amountForAccountCurrency(tx.amount, tx.currency || accountCurrency, accountCurrency, tx);
    }
    if (tx.type === 'expense' && tx.accountId === accountId) {
      return balance - amountForAccountCurrency(tx.amount, tx.currency || accountCurrency, accountCurrency, tx);
    }
    if (tx.type === 'transfer' && tx.fromAccountId === accountId) {
      return balance - amountForAccountCurrency(tx.amount, tx.currency || accountCurrency, accountCurrency, tx);
    }
    if (tx.type === 'transfer' && tx.toAccountId === accountId) {
      return balance + amountForAccountCurrency(tx.toAmount ?? tx.amount ?? 0, tx.toCurrency || accountCurrency, accountCurrency, tx);
    }
    return balance;
  }, 0);
}

function recalcAccounts(accounts, transactions) {
  const accountList = Array.isArray(accounts) ? accounts : [];
  const txList = Array.isArray(transactions) ? transactions : [];
  const normalized = accountList.map(normalizeDefaultAccount);
  return normalized.map((account) => {
    const accountCurrency = account.currency || 'LKR';
    const openingBalance = Number(account.openingBalance || 0);
    const balance = openingBalance + getAccountTransactionEffect(account.id, accountCurrency, txList);
    return { ...account, balance };
  });
}

export function useLedger() {
  const [state, setState] = useState(() => {
    try {
      return migrateLedgerState(loadLedgerState(defaultState));
    } catch (error) {
      console.warn('CashNest X state startup failed, using safe defaults:', error);
      return migrateLedgerState(defaultState);
    }
  });
  const [toast, setToast] = useState(null);
  const autoBackupSignatureRef = useRef('');
  const autoBackupTimerRef = useRef(null);
  const localBackupSignatureRef = useRef('');
  const localBackupTimerRef = useRef(null);
  const autoCloudBackupSignatureRef = useRef('');
  const autoCloudBackupTimerRef = useRef(null);
  const loanDueAlertRef = useRef('');
  const latestStateRef = useRef(state);

  useEffect(() => {
    latestStateRef.current = state;
  }, [state]);

  useEffect(() => {
    document.body.classList.toggle('light', state.theme === 'light');
    const accentTheme = getAccentTheme(state.accentColor || 'blue');

    // Keep the selected accent working in both dark and light themes.
    // Light mode defines its own CSS variables on body.light, so setting only
    // :root is not enough because body.light overrides inherited values.
    document.documentElement.style.setProperty('--accent', accentTheme.accent);
    document.documentElement.style.setProperty('--accent2', accentTheme.accent2);
    document.body.style.setProperty('--accent', accentTheme.accent);
    document.body.style.setProperty('--accent2', accentTheme.accent2);

    setStoredCurrencyCode(state.currency || 'LKR');
    setCompactNumberPreference(!!state.preferences?.compactNumbers);
  }, [state.theme, state.accentColor, state.currency, state.preferences?.compactNumbers]);

  useEffect(() => {
    // Keep UI interactions smooth by batching synchronous localStorage writes.
    const save = () => saveLedgerState(latestStateRef.current);
    const idleId = typeof window !== 'undefined' && 'requestIdleCallback' in window
      ? window.requestIdleCallback(save, { timeout: 700 })
      : null;
    const timer = idleId ? null : setTimeout(save, 120);
    return () => {
      if (idleId && 'cancelIdleCallback' in window) window.cancelIdleCallback(idleId);
      if (timer) clearTimeout(timer);
    };
  }, [state]);

  useEffect(() => {
    const flush = () => saveLedgerState(latestStateRef.current);
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const status = state.googleBackup?.status || '';
    if (!['checking', 'uploading', 'restoring'].includes(status)) return undefined;
    const timer = setTimeout(() => {
      setState((prev) => {
        const currentStatus = prev.googleBackup?.status || '';
        if (!['checking', 'uploading', 'restoring'].includes(currentStatus)) return prev;
        return {
          ...prev,
          googleBackup: {
            ...(prev.googleBackup || {}),
            status: 'error',
            error: 'Cloudflare KV sync is taking too long. Check internet connection and try again.'
          }
        };
      });
    }, 55000);
    return () => clearTimeout(timer);
  }, [state.googleBackup?.status]);

  const categories = useMemo(() => allCategories(state.customCategories || []), [state.customCategories]);
  const disabledCategoryNames = useMemo(() => new Set((state.preferences?.disabledCategories || []).map((name) => String(name || '').toLowerCase())), [state.preferences?.disabledCategories]);
  const visibleCategories = useMemo(() => {
    const enabled = categories.filter((category) => !disabledCategoryNames.has(String(category.name || '').toLowerCase()));
    return enabled.length ? enabled : categories;
  }, [categories, disabledCategoryNames]);
  const accounts = useMemo(() => recalcAccounts(state.accounts, state.transactions), [state.accounts, state.transactions]);
  const totals = useMemo(() => buildConvertedAllTotals(accounts, state.transactions, state.currency || 'LKR'), [accounts, state.transactions, state.currency]);

  useEffect(() => {
    const signature = JSON.stringify({
      onboardingComplete: state.onboardingComplete,
      userName: state.userName,
      currency: state.currency,
      theme: state.theme,
      accentColor: state.accentColor,
      accounts: state.accounts,
      transactions: state.transactions,
      loans: state.loans,
      budgets: state.budgets,
      customCategories: state.customCategories,
      disabledCategories: state.preferences?.disabledCategories || [],
      preferences: state.preferences
    });
    if (!autoBackupSignatureRef.current) {
      autoBackupSignatureRef.current = signature;
      return undefined;
    }
    if (autoBackupSignatureRef.current === signature) return undefined;
    autoBackupSignatureRef.current = signature;
    if (!GOOGLE_BACKUP_ENABLED || !state.signedIn || !state.googleAccessToken || state.preferences?.autoGoogleBackup === false) return undefined;
    if (state.googleBackup?.status === 'uploading' || state.googleBackup?.status === 'restoring') return undefined;
    if (autoBackupTimerRef.current) clearTimeout(autoBackupTimerRef.current);
    autoBackupTimerRef.current = setTimeout(async () => {
      try {
        setState((prev) => ({ ...prev, googleBackup: { ...(prev.googleBackup || {}), status: 'uploading', error: '' } }));
        await runFirebaseKvWithFreshToken((token) => saveFirebaseKvBackupWithToken(token, state, accounts, 'auto-change'), 'auto-change');
      } catch (error) {
        console.error('Auto Firebase KV backup failed', error);
        setState((prev) => ({ ...prev, googleBackup: { ...(prev.googleBackup || {}), status: 'error', error: error?.message || 'Auto backup failed' } }));
      }
    }, 4500);
    return () => {
      if (autoBackupTimerRef.current) clearTimeout(autoBackupTimerRef.current);
    };
  }, [state.onboardingComplete, state.userName, state.currency, state.theme, state.accentColor, state.accounts, state.transactions, state.loans, state.budgets, state.customCategories, state.preferences, state.signedIn, state.googleAccessToken, state.googleBackup?.status, accounts]);

  useEffect(() => {
    const signature = localBackupSignature(state);
    if (!localBackupSignatureRef.current) {
      localBackupSignatureRef.current = signature;
      return undefined;
    }
    if (localBackupSignatureRef.current === signature) return undefined;
    localBackupSignatureRef.current = signature;
    if (state.preferences?.autoLocalBackup !== true) return undefined;
    if (localBackupTimerRef.current) clearTimeout(localBackupTimerRef.current);
    localBackupTimerRef.current = setTimeout(async () => {
      try {
        const sourceState = latestStateRef.current || state;
        const result = await saveAutomaticLocalBackup(sourceState, accounts);
        setState((prev) => ({
          ...prev,
          localBackup: {
            ...(prev.localBackup || {}),
            status: 'synced',
            lastAutoBackupAt: result.savedAt,
            fileName: result.fileName || result.filename || 'CashNest-X-auto-local-backup.cnbak',
            path: result.path || prev.localBackup?.path || '',
            error: ''
          }
        }));
      } catch (error) {
        console.error('Auto local backup failed', error);
        setState((prev) => ({
          ...prev,
          localBackup: {
            ...(prev.localBackup || {}),
            status: 'error',
            error: error?.message || 'Auto local backup failed'
          }
        }));
      }
    }, 1200);
    return () => {
      if (localBackupTimerRef.current) clearTimeout(localBackupTimerRef.current);
    };
  }, [state.onboardingComplete, state.userName, state.currency, state.theme, state.accentColor, state.accounts, state.transactions, state.loans, state.budgets, state.customCategories, state.preferences?.disabledCategories, state.preferences?.autoLocalBackup, state.preferences?.autoGoogleBackup, state.preferences?.compactNumbers, state.preferences?.notifications, state.preferences?.transactionSounds, accounts]);

  // Extra cloud provider auto-backup was removed.
  // Firebase Google login now syncs every signed-in user to their own Cloudflare KV key.

  useEffect(() => {
    if (state.preferences?.notifications === false) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const alertLoans = (state.loans || [])
      .filter((loan) => loan.status !== 'paid' && loan.dueDateValue)
      .map((loan) => {
        const due = new Date(`${loan.dueDateValue}T00:00:00`);
        const days = Number.isNaN(due.getTime()) ? null : Math.ceil((due.getTime() - today.getTime()) / 86400000);
        return { ...loan, days };
      })
      .filter((loan) => loan.days !== null && loan.days <= 3)
      .sort((a, b) => a.days - b.days);
    if (!alertLoans.length) return;
    const key = `${today.toISOString().slice(0, 10)}:${alertLoans.map((loan) => `${loan.id}:${loan.days}`).join('|')}`;
    if (loanDueAlertRef.current === key) return;
    loanDueAlertRef.current = key;
    const loan = alertLoans[0];
    const title = loan.days < 0 ? 'Loan overdue' : loan.days === 0 ? 'Loan due today' : 'Loan due soon';
    const desc = `${loan.person || 'Loan'} • ${loan.days < 0 ? `${Math.abs(loan.days)} days overdue` : loan.days === 0 ? 'due today' : `due in ${loan.days} days`}`;
    const appNotification = createNotification({ title, desc, icon: 'ti-clock-dollar', color: loan.days <= 0 ? 'red' : 'amber', type: 'loanDue', action: 'records' });
    setState((prev) => ({ ...prev, notifications: [appNotification, ...(prev.notifications || [])].slice(0, 60) }));
    showMobileNotification(true, title, desc, { type: 'loanDue', color: loan.days <= 0 ? 'red' : 'amber', screen: 'records', appNotificationId: appNotification.id, tag: `cashnest_x-loan-due-${loan.id}` });
  }, [state.loans, state.preferences?.notifications]);

  function notify(message, icon = 'ti-check') {
    setToast({ message, icon });
  }

  function addAccount(data) {
    const account = {
      id: uid(),
      name: data.name?.trim() || 'Cash Wallet',
      type: data.type || 'Cash Wallet',
      openingBalance: Number(data.openingBalance || 0),
      balance: Number(data.openingBalance || 0),
      color: data.color || 'accent',
      currency: data.currency || state.currency || 'LKR',
      hideFromTotal: !!data.hideFromTotal,
      balanceCorrectionDateValue: data.dateValue || todayInputValue(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      icon: data.icon || (data.type === 'Bank Account' || data.type === 'Savings Account' ? 'ti-building-bank' : 'ti-wallet')
    };
    setState((prev) => ({
      ...prev,
      accounts: [...prev.accounts, account]
    }));
    notify('Account added', 'ti-wallet');
    return account;
  }


  function updateAccount(id, data) {
    setState((prev) => ({
      ...prev,
      accounts: prev.accounts.map((account) => {
        if (account.id !== id) return account;
        const isDefault = account.isDefault || account.id === 'cash-wallet-default' || account.name === 'Cash Wallet';
        const nextCurrency = data.currency || account.currency || prev.currency || 'LKR';
        const currentEffect = getAccountTransactionEffect(account.id, nextCurrency, prev.transactions || []);
        const desiredCurrentBalance = Number(data.openingBalance ?? account.balance ?? account.openingBalance ?? 0);
        const nextOpeningBalance = desiredCurrentBalance - currentEffect;
        const previousEffect = getAccountTransactionEffect(account.id, account.currency || prev.currency || 'LKR', prev.transactions || []);
        const previousCurrentBalance = Number(account.openingBalance || 0) + previousEffect;
        return {
          ...account,
          name: isDefault ? 'Cash Wallet' : (data.name?.trim() || account.name),
          type: isDefault ? 'Cash Wallet' : (data.type || account.type),
          openingBalance: Number.isFinite(nextOpeningBalance) ? nextOpeningBalance : 0,
          balanceCorrectionDateValue: desiredCurrentBalance !== previousCurrentBalance || nextCurrency !== (account.currency || prev.currency || 'LKR') ? todayInputValue() : (account.balanceCorrectionDateValue || account.createdDateValue || ''),
          updatedAt: Date.now(),
          color: data.color || account.color,
          currency: nextCurrency,
          hideFromTotal: !!data.hideFromTotal,
          icon: isDefault ? 'ti-wallet' : (data.icon || account.icon),
          isDefault: Boolean(isDefault)
        };
      })
    }));
    notify('Account updated', 'ti-edit');
  }

  function deleteAccount(id) {
    let blocked = false;
    setState((prev) => {
      const account = prev.accounts.find((item) => item.id === id);
      if (!account || account.isDefault || account.id === 'cash-wallet-default' || account.name === 'Cash Wallet') {
        blocked = true;
        return prev;
      }
      return {
        ...prev,
        accounts: prev.accounts.filter((item) => item.id !== id),
        transactions: prev.transactions.filter((tx) => tx.accountId !== id && tx.fromAccountId !== id && tx.toAccountId !== id)
      };
    });
    notify(blocked ? 'Cash Wallet cannot be deleted' : 'Account deleted', blocked ? 'ti-lock' : 'ti-trash');
  }

  function addCategory(data) {
    const name = data.name?.trim();
    if (!name) return;
    const category = { id: uid(), name, icon: data.icon || 'ti-tag', color: data.color || 'accent', custom: true };
    setState((prev) => {
      const exists = allCategories(prev.customCategories || []).some((item) => item.name.toLowerCase() === name.toLowerCase());
      if (exists) return prev;
      return { ...prev, customCategories: [category, ...(prev.customCategories || [])] };
    });
    notify('Category added', category.icon);
  }

  function deleteCategory(name) {
    setState((prev) => ({
      ...prev,
      customCategories: (prev.customCategories || []).filter((item) => item.name !== name),
      preferences: {
        ...(prev.preferences || {}),
        disabledCategories: (prev.preferences?.disabledCategories || []).filter((item) => String(item).toLowerCase() !== String(name).toLowerCase())
      }
    }));
    notify('Category deleted', 'ti-trash');
  }

  function toggleCategoryEnabled(name) {
    const categoryName = String(name || '').trim();
    if (!categoryName) return;
    let enabled = true;
    setState((prev) => {
      const current = new Set((prev.preferences?.disabledCategories || []).map((item) => String(item)));
      const existing = Array.from(current).find((item) => item.toLowerCase() === categoryName.toLowerCase());
      if (existing) {
        current.delete(existing);
        enabled = true;
      } else {
        current.add(categoryName);
        enabled = false;
      }
      return {
        ...prev,
        preferences: {
          ...(prev.preferences || {}),
          disabledCategories: Array.from(current)
        }
      };
    });
    notify(enabled ? 'Category enabled' : 'Category disabled', enabled ? 'ti-toggle-right' : 'ti-toggle-left');
  }

  function ensureDefaultAccount(prev) {
    if (prev.accounts.length) return { next: prev, account: prev.accounts[0] };
    const account = { id: 'cash-wallet-default', name: 'Cash Wallet', type: 'Cash Wallet', openingBalance: 0, balance: 0, color: 'amber', icon: 'ti-wallet', currency: prev.currency || 'LKR', hideFromTotal: false, isDefault: true, balanceCorrectionDateValue: todayInputValue(), createdAt: Date.now(), updatedAt: Date.now() };
    return { next: { ...prev, accounts: [account] }, account };
  }

  function addTransaction(data) {
    setState((prev) => {
      let working = prev;
      let account = prev.accounts.find((item) => item.id === data.accountId);
      if (!account && data.type !== 'transfer') {
        const result = ensureDefaultAccount(prev);
        working = result.next;
        account = result.account;
      }
      const fromAccount = working.accounts.find((item) => item.id === data.fromAccountId);
      const toAccount = working.accounts.find((item) => item.id === data.toAccountId);
      const recordRateSnapshot = createRecordRateSnapshot(data.rates || getBestCurrencyRates(), { baseCurrency: working.currency || 'LKR', dateValue: data.dateValue || todayInputValue() });
      const transferAmounts = data.type === 'transfer' ? getTransferAmounts({ amount: data.amount, fromAccount, toAccount, rates: recordRateSnapshot.rates }) : null;
      const baseInfo = categoryInfo(data.category, data.type, working.customCategories || []);
      const info = { ...baseInfo, icon: data.forceIcon || baseInfo.icon, color: data.forceColor || baseInfo.color };
      const tx = {
        id: uid(),
        type: data.type,
        amount: Number(data.amount || 0),
        category: data.type === 'income' ? 'Income' : data.type === 'transfer' ? 'Transfer' : data.category,
        title: data.forceTitle || data.note?.trim() || (data.type === 'income' ? 'New Income' : data.type === 'transfer' ? 'Account Transfer' : `${data.category} Expense`),
        accountId: account?.id || data.accountId || '',
        accountName: account?.name || 'Cash Wallet',
        fromAccountId: data.fromAccountId || '',
        toAccountId: data.toAccountId || '',
        fromAccountName: fromAccount?.name || '',
        toAccountName: toAccount?.name || '',
        toAmount: data.type === 'transfer' ? Number(data.toAmount ?? transferAmounts?.targetAmount ?? data.amount ?? 0) : undefined,
        toCurrency: data.type === 'transfer' ? (toAccount?.currency || data.toCurrency || working.currency || 'LKR') : undefined,
        date: formatCalendarDate(data.dateValue || todayInputValue()),
        dateValue: data.dateValue || todayInputValue(),
        icon: info.icon,
        color: info.color,
        receiptImage: data.receiptImage || '',
        receiptName: data.receiptName || '',
        loanId: data.loanId || '',
        loanKind: data.loanKind || '',
        loanPerson: data.loanPerson || '',
        transactionNature: data.transactionNature || '',
        currency: data.currency || transferAmounts?.fromCurrency || account?.currency || working.currency || 'LKR',
        note: data.note || '',
        rateSnapshot: recordRateSnapshot,
        exchangeRates: recordRateSnapshot.rates,
        createdAt: Date.now()
      };
      return {
        ...working,
        transactions: [tx, ...working.transactions]
      };
    });
    playTransactionSound(state.preferences?.transactionSounds !== false, 'success');
    notify('Transaction saved', 'ti-check');
  }

  function updateTransaction(id, data) {
    let updatedTx = null;
    setState((prev) => {
      let working = prev;
      let account = prev.accounts.find((item) => item.id === data.accountId);
      if (!account && data.type !== 'transfer') {
        const result = ensureDefaultAccount(prev);
        working = result.next;
        account = result.account;
      }
      const fromAccount = working.accounts.find((item) => item.id === data.fromAccountId);
      const toAccount = working.accounts.find((item) => item.id === data.toAccountId);
      const transferAmounts = data.type === 'transfer' ? getTransferAmounts({ amount: data.amount, fromAccount, toAccount, rates: data.rates || getBestCurrencyRates() }) : null;
      const baseInfo = categoryInfo(data.category, data.type, working.customCategories || []);
      const info = { ...baseInfo, icon: data.forceIcon || baseInfo.icon, color: data.forceColor || baseInfo.color };
      const nextTransactions = working.transactions.map((tx) => {
        if (tx.id !== id) return tx;
        const recordRateSnapshot = tx.rateSnapshot?.rates ? tx.rateSnapshot : createRecordRateSnapshot(data.rates || getRecordRates(tx, getBestCurrencyRates()), { baseCurrency: working.currency || 'LKR', dateValue: data.dateValue || tx.dateValue || todayInputValue() });
        const editTransferAmounts = data.type === 'transfer' ? getTransferAmounts({ amount: data.amount, fromAccount, toAccount, rates: recordRateSnapshot.rates }) : null;
        updatedTx = {
          ...tx,
          type: data.type,
          amount: Number(data.amount || 0),
          category: data.type === 'income' ? 'Income' : data.type === 'transfer' ? 'Transfer' : data.category,
          title: data.forceTitle || data.note?.trim() || (data.type === 'income' ? 'New Income' : data.type === 'transfer' ? 'Account Transfer' : `${data.category} Expense`),
          accountId: data.type === 'transfer' ? '' : (account?.id || data.accountId || ''),
          accountName: data.type === 'transfer' ? '' : (account?.name || 'Cash Wallet'),
          fromAccountId: data.type === 'transfer' ? (data.fromAccountId || '') : '',
          toAccountId: data.type === 'transfer' ? (data.toAccountId || '') : '',
          fromAccountName: data.type === 'transfer' ? (fromAccount?.name || tx.fromAccountName || '') : '',
          toAccountName: data.type === 'transfer' ? (toAccount?.name || tx.toAccountName || '') : '',
          toAmount: data.type === 'transfer' ? Number(data.toAmount ?? editTransferAmounts?.targetAmount ?? data.amount ?? 0) : undefined,
          toCurrency: data.type === 'transfer' ? (toAccount?.currency || data.toCurrency || working.currency || 'LKR') : undefined,
          date: formatCalendarDate(data.dateValue || tx.dateValue || todayInputValue()),
          dateValue: data.dateValue || tx.dateValue || todayInputValue(),
          icon: info.icon,
          color: info.color,
          receiptImage: data.receiptImage ?? tx.receiptImage ?? '',
          receiptName: data.receiptName ?? tx.receiptName ?? '',
          loanId: data.loanId ?? tx.loanId ?? '',
          loanKind: data.loanKind ?? tx.loanKind ?? '',
          loanPerson: data.loanPerson ?? tx.loanPerson ?? '',
          transactionNature: data.transactionNature ?? tx.transactionNature ?? '',
          currency: data.currency || editTransferAmounts?.fromCurrency || transferAmounts?.fromCurrency || tx.currency || account?.currency || working.currency || 'LKR',
          note: data.note ?? tx.note ?? '',
          rateSnapshot: recordRateSnapshot,
          exchangeRates: recordRateSnapshot.rates,
          updatedAt: Date.now()
        };
        return updatedTx;
      });
      return {
        ...working,
        transactions: nextTransactions
      };
    });
    playTransactionSound(state.preferences?.transactionSounds !== false, 'success');
    notify('Transaction updated', 'ti-edit');
  }

  function deleteTransaction(id) {
    setState((prev) => {
      const removed = (prev.transactions || []).find((tx) => tx.id === id);
      const nextTransactions = (prev.transactions || []).filter((tx) => tx.id !== id);
      const isLoanPayment = removed && (String(removed.transactionNature || '').toLowerCase() === 'loan-payment' || removed.loanPaymentId);
      if (!isLoanPayment || !removed.loanId) {
        return { ...prev, transactions: nextTransactions };
      }
      const nextLoans = (prev.loans || []).map((loan) => {
        if (loan.id !== removed.loanId) return normalizeLoan(loan);
        const filteredPayments = (loan.payments || []).filter((payment) => {
          if (removed.loanPaymentId && payment.id === removed.loanPaymentId) return false;
          if (payment.transactionId && payment.transactionId === id) return false;
          return true;
        });
        const nextPaid = filteredPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
        return normalizeLoan({
          ...loan,
          paid: nextPaid,
          payments: filteredPayments
        });
      });
      return { ...prev, transactions: nextTransactions, loans: nextLoans };
    });
    playTransactionSound(state.preferences?.transactionSounds !== false, 'delete');
    notify('Transaction deleted', 'ti-trash');
  }

  function normalizeLoan(loan) {
    const amount = Number(loan.amount || 0);
    const rawPayments = Array.isArray(loan.payments) ? loan.payments : [];
    let payments = rawPayments.map((payment) => ({
      id: payment.id || uid(),
      transactionId: payment.transactionId || '',
      amount: Number(payment.amount || 0),
      accountId: payment.accountId || '',
      accountName: payment.accountName || '',
      currency: payment.currency || loan.currency || state.currency || 'LKR',
      accountAmount: Number(payment.accountAmount || 0),
      accountCurrency: payment.accountCurrency || payment.paymentCurrency || '',
      exchangeRates: payment.exchangeRates || payment.rates || null,
      dateValue: payment.dateValue || loan.dateValue || todayInputValue(),
      note: payment.note || ''
    })).filter((payment) => payment.amount > 0);

    const oldPaid = Number(loan.paid || 0);
    const paymentTotal = payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
    if (!payments.length && oldPaid > 0) {
      payments = [{ id: uid(), amount: Math.min(amount, oldPaid), dateValue: loan.dateValue || todayInputValue(), note: 'Opening paid amount' }];
    } else if (oldPaid > paymentTotal) {
      payments = [...payments, { id: uid(), amount: Math.min(amount - paymentTotal, oldPaid - paymentTotal), dateValue: loan.dateValue || todayInputValue(), note: 'Opening paid amount' }];
    }
    const paid = Math.min(amount, payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0));
    return {
      ...loan,
      amount,
      paid,
      payments,
      dueDateValue: loan.dueDateValue || (loan.due && loan.due !== 'No due date' && /^\d{4}-\d{2}-\d{2}$/.test(loan.due) ? loan.due : ''),
      due: loan.dueDateValue ? formatCalendarDate(loan.dueDateValue) : (loan.due && loan.due !== 'No due date' ? loan.due : ''),
      reminderTime: normalizeLoanReminderTime(loan.reminderTime),
      currency: loan.currency || state.currency || 'LKR',
      accountId: loan.accountId || '',
      status: paid >= amount && amount > 0 ? 'paid' : 'active'
    };
  }

  function addLoan(data) {
    const amount = Number(data.amount || 0);
    const initialPaid = Math.min(amount, Math.max(0, Number(data.paid || 0)));
    const loanId = uid();
    let createdLoanForReminder = null;
    const baseLoan = {
      id: loanId,
      person: data.person?.trim() || 'New Person',
      type: data.type || 'Lending',
      amount,
      paid: 0,
      payments: [],
      dueDateValue: data.dueDateValue || '',
      due: data.dueDateValue ? formatCalendarDate(data.dueDateValue) : '',
      reminderTime: normalizeLoanReminderTime(data.reminderTime),
      note: data.note || '',
      currency: data.currency || state.currency || 'LKR',
      accountId: data.accountId || '',
      dateValue: data.dateValue || todayInputValue(),
      createdAt: Date.now()
    };
    setState((prev) => {
      let working = prev;
      let account = prev.accounts.find((item) => item.id === (data.accountId || baseLoan.accountId));
      if (!account) {
        const result = ensureDefaultAccount(prev);
        working = result.next;
        account = result.account;
      }
      const rates = getBestCurrencyRates();
      let loan = normalizeLoan({ ...baseLoan, accountId: account?.id || data.accountId || '' });
      const notifications = loan.dueDateValue
        ? addNotificationIfEnabled(working, { title: 'Loan reminder set', desc: `${loan.person} • due ${loan.due} at ${formatLoanReminderTime(loan.reminderTime)}.`, icon: 'ti-clock-dollar', color: loan.type === 'Borrowing' ? 'red' : 'green', type: 'loanDue' })
        : (working.notifications || []);
      const nextTransactions = [...(working.transactions || [])];
      if (data.createLinkedTransaction) {
        const recordRateSnapshot = createRecordRateSnapshot(rates, { baseCurrency: working.currency || 'LKR', dateValue: data.dateValue || todayInputValue() });
        const txType = loan.type === 'Lending' ? 'expense' : 'income';
        const category = loan.type === 'Lending' ? 'Loan Given' : 'Loan Received';
        nextTransactions.unshift({
          id: uid(),
          type: txType,
          amount: Number(amount || 0),
          category,
          title: loan.type === 'Lending' ? `Loan to ${loan.person}` : `Loan from ${loan.person}`,
          accountId: account?.id || data.accountId || '',
          accountName: account?.name || 'Cash Wallet',
          fromAccountId: '',
          toAccountId: '',
          fromAccountName: '',
          toAccountName: '',
          toAmount: undefined,
          toCurrency: undefined,
          date: formatCalendarDate(data.dateValue || todayInputValue()),
          dateValue: data.dateValue || todayInputValue(),
          icon: 'ti-clock-dollar',
          color: loan.type === 'Lending' ? 'amber' : 'green',
          receiptImage: '',
          receiptName: '',
          loanId: loan.id,
          loanKind: loan.type,
          loanPerson: loan.person,
          transactionNature: 'loan',
          currency: data.currency || loan.currency || account?.currency || working.currency || 'LKR',
          note: data.note || `${loan.type} - ${loan.person}`,
          rateSnapshot: recordRateSnapshot,
          exchangeRates: recordRateSnapshot.rates,
          createdAt: Date.now()
        });

        // If the loan already has a paid amount at creation, create the matching
        // payment transaction too. Without this, the loan progress was right but
        // account balance/home/analytics were short by the paid amount.
        if (initialPaid > 0) {
          const paymentId = uid();
          const paymentTx = buildLoanPaymentTransaction({
            loan,
            amount: initialPaid,
            account,
            dateValue: data.dateValue || todayInputValue(),
            note: 'Initial payment',
            customCategories: working.customCategories || [],
            paymentId,
            rates
          });
          loan = normalizeLoan({
            ...loan,
            payments: [{
              id: paymentId,
              transactionId: paymentTx?.id || '',
              amount: initialPaid,
              accountId: account?.id || '',
              accountName: account?.name || '',
              currency: loan.currency || working.currency || 'LKR',
              accountAmount: Number(paymentTx?.accountAmount || 0),
              accountCurrency: paymentTx?.accountCurrency || account?.currency || loan.currency || working.currency || 'LKR',
              exchangeRates: rates,
              dateValue: data.dateValue || todayInputValue(),
              note: 'Initial payment'
            }]
          });
          nextTransactions.unshift(paymentTx);
        }
      } else if (initialPaid > 0) {
        loan = normalizeLoan({
          ...loan,
          payments: [{ id: uid(), amount: initialPaid, currency: loan.currency || working.currency || 'LKR', dateValue: data.dateValue || todayInputValue(), note: 'Initial payment' }]
        });
      }
      createdLoanForReminder = loan;
      return {
        ...working,
        loans: [loan, ...(working.loans || []).map(normalizeLoan)],
        transactions: nextTransactions,
        notifications
      };
    });
    playTransactionSound(state.preferences?.transactionSounds !== false, 'success');
    scheduleLoanReminder(state.preferences?.notifications !== false, createdLoanForReminder || baseLoan);
    notify('Loan added', 'ti-clock-dollar');
    return createdLoanForReminder || baseLoan;
  }



  function updateLoan(id, data = {}) {
    let loanToReschedule = null;
    setState((prev) => {
      let editedLoan = null;
      const nextLoans = (prev.loans || []).map((item) => {
        if (item.id !== id) return normalizeLoan(item);
        const current = normalizeLoan(item);
        const amount = Math.max(0, Number(data.amount ?? current.amount ?? 0));
        const desiredPaid = Math.min(amount, Math.max(0, Number(data.paid ?? current.paid ?? 0)));
        const currentPaid = Number(current.paid || 0);
        const paymentNotes = (current.payments || []).map((payment) => String(payment.note || '').toLowerCase());
        const canRewriteOpeningPaid = (current.payments || []).length <= 1
          || paymentNotes.every((note) => note === 'initial payment' || note === 'opening paid amount' || note === 'manual paid adjustment');
        let payments = current.payments || [];

        if (Math.abs(desiredPaid - currentPaid) > 0.009 && canRewriteOpeningPaid) {
          payments = desiredPaid > 0 ? [{
            id: payments[0]?.id || uid(),
            transactionId: payments[0]?.transactionId || '',
            amount: desiredPaid,
            accountId: data.accountId ?? current.accountId ?? payments[0]?.accountId ?? '',
            accountName: payments[0]?.accountName || '',
            currency: data.currency || current.currency || prev.currency || 'LKR',
            accountAmount: Number(payments[0]?.accountAmount || 0),
            accountCurrency: payments[0]?.accountCurrency || '',
            exchangeRates: payments[0]?.exchangeRates || null,
            dateValue: data.dateValue || current.dateValue || todayInputValue(),
            note: payments[0]?.note || 'Opening paid amount'
          }] : [];
        } else {
          payments = payments.map((payment) => ({
            ...payment,
            currency: payment.currency || data.currency || current.currency || prev.currency || 'LKR'
          }));
        }

        const nextDueDateValue = data.dueDateValue ?? current.dueDateValue ?? '';
        editedLoan = normalizeLoan({
          ...current,
          person: data.person?.trim() || current.person || 'Loan Person',
          type: data.type || current.type || 'Lending',
          amount,
          payments,
          dueDateValue: nextDueDateValue,
          due: nextDueDateValue ? formatCalendarDate(nextDueDateValue) : '',
          reminderTime: normalizeLoanReminderTime(data.reminderTime ?? current.reminderTime),
          dateValue: data.dateValue || current.dateValue || todayInputValue(),
          note: data.note ?? current.note ?? '',
          currency: data.currency || current.currency || prev.currency || 'LKR',
          accountId: data.accountId ?? current.accountId ?? '',
          updatedAt: Date.now()
        });
        loanToReschedule = editedLoan;
        return editedLoan;
      });

      const nextTransactions = (prev.transactions || []).map((tx) => {
        if (tx.loanId !== id || !editedLoan) return tx;
        const isLending = editedLoan.type === 'Lending';
        const person = editedLoan.person || 'Loan Person';
        const baseUpdate = {
          loanKind: editedLoan.type,
          loanPerson: person,
          updatedAt: Date.now()
        };

        if (String(tx.transactionNature || '').toLowerCase() === 'loan-payment' || tx.loanPaymentId) {
          return {
            ...tx,
            ...baseUpdate,
            type: isLending ? 'income' : 'expense',
            category: isLending ? 'Loan Payment Received' : 'Loan Repayment',
            title: isLending ? `Payment from ${person}` : `Payment to ${person}`,
            color: isLending ? 'green' : 'red',
            loanCurrency: tx.loanCurrency || editedLoan.currency || prev.currency || 'LKR'
          };
        }

        const account = prev.accounts.find((acc) => acc.id === (data.accountId || editedLoan.accountId || tx.accountId)) || prev.accounts.find((acc) => acc.id === tx.accountId);
        return {
          ...tx,
          ...baseUpdate,
          type: isLending ? 'expense' : 'income',
          amount: Number(editedLoan.amount || 0),
          category: isLending ? 'Loan Given' : 'Loan Received',
          title: isLending ? `Loan to ${person}` : `Loan from ${person}`,
          accountId: account?.id || editedLoan.accountId || tx.accountId || '',
          accountName: account?.name || tx.accountName || 'Cash Wallet',
          date: formatCalendarDate(editedLoan.dateValue || tx.dateValue || todayInputValue()),
          dateValue: editedLoan.dateValue || tx.dateValue || todayInputValue(),
          currency: editedLoan.currency || tx.currency || prev.currency || 'LKR',
          note: editedLoan.note || `${editedLoan.type} - ${person}`,
          color: isLending ? 'amber' : 'green'
        };
      });

      return { ...prev, loans: nextLoans, transactions: nextTransactions };
    });
    if (loanToReschedule?.dueDateValue && loanToReschedule.status !== 'paid') {
      scheduleLoanReminder(state.preferences?.notifications !== false, loanToReschedule);
    } else if (loanToReschedule?.id) {
      cancelLoanReminder(loanToReschedule.id);
    }
    playTransactionSound(state.preferences?.transactionSounds !== false, 'success');
    notify('Loan updated', 'ti-edit');
  }

  function addLoanPayment(id, data) {
    const inputAmount = Math.max(0, Number(data.amount || 0));
    if (!inputAmount) return;
    let toastText = 'Payment added';
    setState((prev) => {
      let paymentTx = null;
      const nextLoans = (prev.loans || []).map((item) => {
        if (item.id !== id) return normalizeLoan(item);
        const loan = normalizeLoan(item);
        const remaining = Math.max(0, loan.amount - loan.paid);
        const account = prev.accounts.find((acc) => acc.id === data.accountId) || prev.accounts.find((acc) => acc.id === loan.accountId) || prev.accounts[0];
        const rates = data.rates || getBestCurrencyRates();
        const loanCurrency = loan.currency || prev.currency || 'LKR';
        const amountCurrency = data.amountCurrency || loanCurrency;
        const convertedAmount = amountCurrency === loanCurrency ? inputAmount : convertCurrency(inputAmount, amountCurrency, loanCurrency, rates);
        const paymentAmount = Math.min(remaining || convertedAmount, convertedAmount);
        toastText = paymentAmount >= remaining ? 'Loan fully paid' : 'Part payment added';
        const paymentId = uid();
        paymentTx = buildLoanPaymentTransaction({ loan, amount: paymentAmount, account, dateValue: data.dateValue, note: data.note, customCategories: prev.customCategories || [], paymentId, rates });
        return normalizeLoan({
          ...loan,
          payments: [{
            id: paymentId,
            transactionId: paymentTx?.id || '',
            amount: paymentAmount,
            accountId: account?.id || '',
            accountName: account?.name || '',
            currency: loanCurrency,
            accountAmount: Number(paymentTx?.accountAmount || 0),
            accountCurrency: paymentTx?.accountCurrency || amountCurrency,
            exchangeRates: rates,
            dateValue: data.dateValue || todayInputValue(),
            note: data.note || ''
          }, ...(loan.payments || [])]
        });
      });
      return {
        ...prev,
        loans: nextLoans,
        transactions: paymentTx ? [paymentTx, ...(prev.transactions || [])] : (prev.transactions || [])
      };
    });
    playTransactionSound(state.preferences?.transactionSounds !== false, 'success');
    notify(toastText, 'ti-cash');
  }


  function updateLoanPayment(loanId, paymentId, data = {}) {
    const inputAmount = Math.max(0, Number(data.amount || 0));
    if (!inputAmount) return;
    setState((prev) => {
      let updatedPayment = null;
      let updatedLoan = null;
      let updatedLoanAmount = inputAmount;
      const account = prev.accounts.find((acc) => acc.id === data.accountId) || prev.accounts[0];
      const rates = data.rates || getBestCurrencyRates();
      const nextLoans = (prev.loans || []).map((item) => {
        if (item.id !== loanId) return normalizeLoan(item);
        const loan = normalizeLoan(item);
        const loanCurrency = loan.currency || prev.currency || 'LKR';
        const amountCurrency = data.amountCurrency || loanCurrency;
        const amount = amountCurrency === loanCurrency ? inputAmount : convertCurrency(inputAmount, amountCurrency, loanCurrency, rates);
        const accountCurrencyForPayment = account?.currency || amountCurrency || loanCurrency;
        const accountAmountForPayment = loanCurrency === accountCurrencyForPayment ? amount : convertCurrency(amount, loanCurrency, accountCurrencyForPayment, rates);
        updatedLoanAmount = amount;
        let matched = false;
        const nextPayments = (loan.payments || []).map((pay) => {
          const fallbackMatch = !paymentId
            && Number(pay.amount || 0) === Number(data.originalAmount || 0)
            && (pay.dateValue || '') === (data.originalDateValue || '')
            && String(pay.note || '') === String(data.originalNote || '');
          if (pay.id !== paymentId && !fallbackMatch) return pay;
          matched = true;
          updatedPayment = {
            ...pay,
            amount,
            accountId: account?.id || data.accountId || pay.accountId || '',
            accountName: account?.name || pay.accountName || '',
            currency: loanCurrency,
            accountAmount: accountAmountForPayment,
            accountCurrency: accountCurrencyForPayment,
            exchangeRates: rates,
            dateValue: data.dateValue || pay.dateValue || todayInputValue(),
            note: data.note || ''
          };
          return updatedPayment;
        });
        if (!matched) {
          updatedPayment = {
            id: paymentId || uid(),
            transactionId: data.transactionId || '',
            amount,
            accountId: account?.id || data.accountId || '',
            accountName: account?.name || '',
            currency: loanCurrency,
            accountAmount: accountAmountForPayment,
            accountCurrency: accountCurrencyForPayment,
            exchangeRates: rates,
            dateValue: data.dateValue || todayInputValue(),
            note: data.note || ''
          };
          nextPayments.unshift(updatedPayment);
        }
        updatedLoan = normalizeLoan({ ...loan, payments: nextPayments });
        return updatedLoan;
      });
      const loanForTx = updatedLoan || nextLoans.find((loan) => loan.id === loanId);
      const nextTransactions = (prev.transactions || []).map((tx) => {
        const byTxId = data.transactionId && tx.id === data.transactionId;
        const byPaymentId = paymentId && tx.loanPaymentId === paymentId;
        const fallback = tx.loanId === loanId
          && String(tx.transactionNature || '').toLowerCase() === 'loan-payment'
          && Number(tx.loanAmount ?? tx.amount ?? 0) === Number(data.originalAmount || 0)
          && (tx.dateValue || '') === (data.originalDateValue || '')
          && String(tx.note || '') === String(data.originalNote || '');
        if (!byTxId && !byPaymentId && !fallback) return tx;
        const isLending = (loanForTx?.type || tx.loanKind) === 'Lending';
        const loanCurrency = loanForTx?.currency || tx.loanCurrency || prev.currency || 'LKR';
        const accountCurrency = account?.currency || tx.accountCurrency || tx.currency || loanCurrency;
        const loanAmount = updatedLoanAmount || convertCurrency(inputAmount, data.amountCurrency || loanCurrency, loanCurrency, rates);
        const accountAmount = loanCurrency === accountCurrency ? loanAmount : convertCurrency(loanAmount, loanCurrency, accountCurrency, rates);
        return {
          ...tx,
          type: isLending ? 'income' : 'expense',
          amount: accountAmount,
          loanAmount,
          loanCurrency,
          accountAmount,
          accountCurrency,
          currency: accountCurrency,
          exchangeRates: rates,
          category: isLending ? 'Loan Payment Received' : 'Loan Repayment',
          title: isLending ? `Payment from ${loanForTx?.person || tx.loanPerson || 'Loan Person'}` : `Payment to ${loanForTx?.person || tx.loanPerson || 'Loan Person'}`,
          accountId: account?.id || data.accountId || tx.accountId || '',
          accountName: account?.name || tx.accountName || '',
          date: formatCalendarDate(data.dateValue || tx.dateValue || todayInputValue()),
          dateValue: data.dateValue || tx.dateValue || todayInputValue(),
          loanPaymentId: paymentId || tx.loanPaymentId || updatedPayment?.id || '',
          note: data.note || '',
          updatedAt: Date.now()
        };
      });
      return { ...prev, loans: nextLoans, transactions: nextTransactions };
    });
    playTransactionSound(state.preferences?.transactionSounds !== false, 'success');
    notify('Loan payment updated', 'ti-edit');
  }


  function deleteLoanPayment(loanId, paymentId, paymentData = {}) {
    if (!loanId || !paymentId) return;
    setState((prev) => {
      let removedPayment = null;
      const nextLoans = (prev.loans || []).map((item) => {
        if (item.id !== loanId) return normalizeLoan(item);
        const loan = normalizeLoan(item);
        const filteredPayments = (loan.payments || []).filter((payment) => {
          const matchedByPaymentId = payment.id === paymentId;
          const matchedByTransactionId = paymentData?.transactionId && payment.transactionId === paymentData.transactionId;
          if (matchedByPaymentId || matchedByTransactionId) {
            removedPayment = payment;
            return false;
          }
          return true;
        });
        const nextPaid = filteredPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
        return normalizeLoan({
          ...loan,
          paid: nextPaid,
          payments: filteredPayments
        });
      });
      const targetTransactionId = removedPayment?.transactionId || paymentData?.transactionId || '';
      const targetAmount = Number(removedPayment?.amount ?? paymentData?.amount ?? 0);
      const targetDate = removedPayment?.dateValue || paymentData?.dateValue || '';
      const targetNote = String(removedPayment?.note ?? paymentData?.note ?? '');
      const nextTransactions = (prev.transactions || []).filter((tx) => {
        if (tx.loanId !== loanId) return true;
        if (targetTransactionId && tx.id === targetTransactionId) return false;
        if (paymentId && tx.loanPaymentId === paymentId) return false;
        const isLoanPayment = String(tx.transactionNature || '').toLowerCase() === 'loan-payment' || !!tx.loanPaymentId;
        if (!isLoanPayment) return true;
        const txLoanAmount = Number(tx.loanAmount ?? tx.amount ?? 0);
        const sameAmount = targetAmount > 0 && txLoanAmount === targetAmount;
        const sameDate = !targetDate || (tx.dateValue || '') === targetDate;
        const sameNote = !targetNote || String(tx.note || '') === targetNote;
        return !(sameAmount && sameDate && sameNote);
      });
      return { ...prev, loans: nextLoans, transactions: nextTransactions };
    });
    playTransactionSound(state.preferences?.transactionSounds !== false, 'delete');
    notify('Loan payment deleted', 'ti-trash');
  }


  function markLoanPaid(id, data = {}) {
    setState((prev) => {
      let paymentTx = null;
      const nextLoans = (prev.loans || []).map((item) => {
        if (item.id !== id) return normalizeLoan(item);
        const loan = normalizeLoan(item);
        const remaining = Math.max(0, loan.amount - loan.paid);
        if (!remaining) return loan;
        const account = prev.accounts.find((acc) => acc.id === data.accountId) || prev.accounts.find((acc) => acc.id === loan.accountId) || prev.accounts[0];
        const paymentId = uid();
        paymentTx = buildLoanPaymentTransaction({ loan, amount: remaining, account, dateValue: todayInputValue(), note: 'Marked fully paid', customCategories: prev.customCategories || [], paymentId, rates: data.rates || getBestCurrencyRates() });
        return normalizeLoan({
          ...loan,
          payments: [{
            id: paymentId,
            transactionId: paymentTx?.id || '',
            amount: remaining,
            accountId: account?.id || '',
            accountName: account?.name || '',
            currency: loan.currency || prev.currency || 'LKR',
            accountAmount: Number(paymentTx?.accountAmount || 0),
            accountCurrency: paymentTx?.accountCurrency || account?.currency || loan.currency || prev.currency || 'LKR',
            exchangeRates: data.rates || getBestCurrencyRates(),
            dateValue: todayInputValue(),
            note: 'Marked fully paid'
          }, ...(loan.payments || [])]
        });
      });
      return {
        ...prev,
        loans: nextLoans,
        transactions: paymentTx ? [paymentTx, ...(prev.transactions || [])] : (prev.transactions || [])
      };
    });
    cancelLoanReminder(id);
    playTransactionSound(state.preferences?.transactionSounds !== false, 'success');
    notify('Loan marked fully paid', 'ti-checks');
  }

  function deleteLoan(id) {
    setState((prev) => ({
      ...prev,
      loans: (prev.loans || []).filter((loan) => loan.id !== id),
      transactions: (prev.transactions || []).filter((tx) => tx.loanId !== id)
    }));
    cancelLoanReminder(id);
    notify('Loan deleted', 'ti-trash');
  }


  function addBudget(data) {
    const budget = {
      id: uid(),
      name: data.name?.trim() || `${data.category || 'General'} Budget`,
      category: data.category || 'Food',
      amount: Number(data.amount || 0),
      currency: data.currency || state.currency || 'LKR',
      period: data.period || 'Monthly',
      note: data.note || '',
      createdAt: Date.now()
    };
    setState((prev) => ({
      ...prev,
      budgets: [budget, ...(prev.budgets || [])]
    }));
    notify('Budget added', 'ti-target');
  }

  function deleteBudget(id) {
    setState((prev) => ({
      ...prev,
      budgets: (prev.budgets || []).filter((budget) => budget.id !== id)
    }));
    notify('Budget deleted', 'ti-trash');
  }



  function completeOnboarding(data = {}) {
    const openingBalance = Number(data.currentBalance ?? data.openingBalance ?? 0);
    const monthlyIncome = Number(data.monthlyIncome || 0);
    const currency = data.currency || 'LKR';
    setStoredCurrencyCode(currency);
    setState((prev) => {
      const accounts = (prev.accounts || []).map((account, index) => {
        const isDefault = account.isDefault || account.id === 'cash-wallet-default' || index === 0;
        if (!isDefault) return account;
        return {
          ...account,
          id: account.id || 'cash-wallet-default',
          name: 'Cash Wallet',
          type: 'Cash Wallet',
          openingBalance,
          balance: openingBalance,
          color: account.color || 'amber',
          icon: account.icon || 'ti-wallet',
          isDefault: true,
          currency,
          balanceCorrectionDateValue: data.dateValue || todayInputValue(),
          createdAt: account.createdAt || Date.now(),
          updatedAt: Date.now(),
          hideFromTotal: !!account.hideFromTotal
        };
      });
      const nextAccounts = accounts.length ? accounts : [{ id: 'cash-wallet-default', name: 'Cash Wallet', type: 'Cash Wallet', openingBalance, balance: openingBalance, color: 'amber', icon: 'ti-wallet', currency, hideFromTotal: false, isDefault: true, balanceCorrectionDateValue: data.dateValue || todayInputValue(), createdAt: Date.now(), updatedAt: Date.now() }];
      const nextBudgets = monthlyIncome > 0 && !(prev.budgets || []).some((budget) => budget.id === 'welcome-income-plan')
        ? [{ id: 'welcome-income-plan', name: 'Monthly income plan', category: 'Income', amount: monthlyIncome, currency, period: 'Monthly', note: 'Created from welcome setup', createdAt: Date.now() }, ...(prev.budgets || [])]
        : (prev.budgets || []);
      return {
        ...prev,
        onboardingComplete: true,
        userName: data.name || 'Friend',
        currency,
        theme: data.theme || prev.theme || 'dark',
        accentColor: data.accentColor || prev.accentColor || 'blue',
        accounts: nextAccounts,
        budgets: nextBudgets,
        preferences: {
          ...(prev.preferences || {}),
          notifications: data.notifications !== false
        }
      };
    });
    notify('Welcome setup completed', 'ti-sparkles');
  }

  function setCurrency(code) {
    setStoredCurrencyCode(code || 'LKR');
    setState((prev) => ({ ...prev, currency: code || 'LKR' }));
    notify('Currency updated', 'ti-currency-dollar');
  }


  async function toggleNotifications() {
    const turningOn = state.preferences?.notifications === false;
    if (turningOn) {
      await requestBrowserNotificationPermission();
      await requestNativeNotificationPermission();
    }
    setState((prev) => ({
      ...prev,
      preferences: {
        ...(prev.preferences || {}),
        notifications: !(prev.preferences?.notifications !== false)
      }
    }));
    notify(turningOn ? 'Mobile notifications enabled' : 'Notifications disabled', turningOn ? 'ti-bell-check' : 'ti-bell-off');
    if (turningOn) showMobileNotification(true, 'Important notifications enabled', 'Only releases, exports and reminders will use the notification bar.', { tag: 'cashnest_x-enabled' });
  }

  async function toggleTransactionSounds() {
    const turningOn = state.preferences?.transactionSounds === false;
    if (turningOn) await unlockTransactionSound();
    setState((prev) => ({
      ...prev,
      preferences: {
        ...(prev.preferences || {}),
        transactionSounds: !(prev.preferences?.transactionSounds !== false)
      }
    }));
    if (turningOn) playTransactionSound(true, 'success');
    notify(turningOn ? 'Transaction sounds enabled' : 'Transaction sounds disabled', turningOn ? 'ti-volume' : 'ti-volume-off');
  }

  function toggleCompactNumbers() {
    const nextValue = !state.preferences?.compactNumbers;
    setCompactNumberPreference(nextValue);
    setState((prev) => ({
      ...prev,
      preferences: {
        ...(prev.preferences || {}),
        compactNumbers: !prev.preferences?.compactNumbers
      }
    }));
    notify(nextValue ? 'Short number format enabled' : 'Full number format enabled', nextValue ? 'ti-letter-k' : 'ti-numbers');
  }


  async function toggleBiometricLock() {
    const currentlyOn = !!state.preferences?.biometricLock;
    if (currentlyOn) {
      clearBiometricCredential();
      setState((prev) => ({ ...prev, preferences: { ...(prev.preferences || {}), biometricLock: false } }));
      notify('Biometric lock disabled', 'ti-fingerprint');
      return { ok: true };
    }
    if (!state.preferences?.pinHash) {
      notify('Create a PIN first before enabling fingerprint.', 'ti-lock');
      return { ok: false, needsPin: true, reason: 'PIN required before biometric lock.' };
    }
    const result = await setupBiometricCredential();
    if (!result.ok) {
      notify(result.reason || 'Biometric unavailable. Set a PIN instead.', 'ti-alert-circle');
      return result;
    }
    setState((prev) => ({
      ...prev,
      preferences: {
        ...(prev.preferences || {}),
        biometricLock: true,
        pinLock: prev.preferences?.pinLock || !!prev.preferences?.pinHash
      }
    }));
    notify('Biometric lock enabled', 'ti-fingerprint');
    return { ok: true };
  }

  async function setPinLock(pin, pinLength = pin.length) {
    const salt = createPinSalt();
    const pinHash = await hashPin(pin, salt);
    setState((prev) => ({
      ...prev,
      preferences: {
        ...(prev.preferences || {}),
        pinLock: true,
        pinHash,
        pinSalt: salt,
        pinLength: Number(pinLength || pin.length || 4)
      }
    }));
    notify('PIN lock enabled', 'ti-lock-check');
  }

  function removePinLock() {
    clearBiometricCredential();
    setState((prev) => ({
      ...prev,
      preferences: {
        ...(prev.preferences || {}),
        pinLock: false,
        pinHash: '',
        pinSalt: '',
        biometricLock: false
      }
    }));
    notify('PIN and biometric lock removed', 'ti-lock-open');
  }

  async function verifyPin(pin) {
    const prefs = state.preferences || {};
    if (!prefs.pinHash || !prefs.pinSalt) return false;
    const tryHash = await hashPin(pin, prefs.pinSalt);
    return tryHash === prefs.pinHash;
  }

  async function biometricUnlock() {
    return verifyBiometricCredential();
  }


  function toggleTheme() {
    setState((prev) => ({ ...prev, theme: prev.theme === 'light' ? 'dark' : 'light' }));
  }

  function setAccentColor(value) {
    const accentTheme = getAccentTheme(value || 'blue');
    const nextAccent = accentTheme.value || 'blue';
    setState((prev) => ({ ...prev, accentColor: nextAccent }));
    notify('Accent color updated', 'ti-palette');
  }

  function showGoogleDeveloperMessage() {
    const message = GOOGLE_DISABLED_MESSAGE;
    setState((prev) => ({
      ...prev,
      signedIn: false,
      googleUser: null,
      googleAccessToken: '',
      googleIdToken: '',
      googleBackup: { ...(prev.googleBackup || {}), status: 'disabled', error: message }
    }));
    notify(message, 'ti-alert-circle');
    return { ok: false, disabled: true, message };
  }

  async function refreshFirebaseToken(forceRefresh = false) {
    if (!GOOGLE_BACKUP_ENABLED) throw new Error(GOOGLE_DISABLED_MESSAGE);
    if (!state.signedIn) throw new Error('Connect Google Account first.');
    const currentState = latestStateRef.current || state;
    const currentToken = currentState.googleAccessToken || '';
    const refreshToken = currentState.googleRefreshToken || '';
    const issuedAt = Number(currentState.googleBackup?.firebaseTokenIssuedAt || currentState.firebaseTokenIssuedAt || 0);
    const expiresIn = Number(currentState.googleBackup?.firebaseExpiresIn || currentState.firebaseExpiresIn || 3600);
    const tokenStillFresh = currentToken && issuedAt && (Date.now() - issuedAt) < Math.max(60, expiresIn - 120) * 1000;
    if (!forceRefresh && tokenStillFresh) return currentToken;

    const session = await refreshFirebaseSession(refreshToken);
    setState((prev) => ({
      ...prev,
      googleAccessToken: session.firebaseIdToken,
      googleRefreshToken: session.firebaseRefreshToken || prev.googleRefreshToken || '',
      firebaseUid: session.firebaseUid || prev.firebaseUid || '',
      googleBackup: {
        ...(prev.googleBackup || {}),
        firebaseExpiresIn: session.firebaseExpiresIn || 3600,
        firebaseTokenIssuedAt: session.firebaseTokenIssuedAt || Date.now(),
        error: ''
      }
    }));
    return session.firebaseIdToken;
  }

  function isFirebaseAuthError(error) {
    const message = String(error?.message || '').toLowerCase();
    return message.includes('firebase session')
      || message.includes('jwt')
      || message.includes('unauthorized')
      || message.includes('401')
      || message.includes('token expired')
      || message.includes('invalid token');
  }

  function isNoCloudflareBackupError(error) {
    const message = String(error?.message || '').toLowerCase();
    return message.includes('no backup found') || message.includes('404');
  }

  function googleUserFromAuthUser(user = {}) {
    return {
      name: user.name || 'Google User',
      email: user.email || '',
      imageUrl: user.imageUrl || '',
      id: user.id || '',
      uid: user.firebaseUid || user.uid || '',
      firebaseUid: user.firebaseUid || user.uid || ''
    };
  }

  function buildFirebaseSessionState(baseState, user, status = 'ready') {
    return {
      ...(baseState || defaultState),
      signedIn: true,
      googleUser: googleUserFromAuthUser(user),
      googleAccessToken: user.firebaseIdToken || '',
      googleIdToken: user.googleIdToken || '',
      googleRefreshToken: user.firebaseRefreshToken || '',
      firebaseUid: user.firebaseUid || user.uid || '',
      googleBackup: {
        ...((baseState || {}).googleBackup || {}),
        status,
        firebaseExpiresIn: user.firebaseExpiresIn || 3600,
        firebaseTokenIssuedAt: user.firebaseTokenIssuedAt || Date.now(),
        error: ''
      }
    };
  }

  function buildRestoredFirebaseKvState(backup, session) {
    const restoredAt = new Date().toISOString();
    const modifiedTime = backup?.modifiedTime || backup?.createdAt || restoredAt;
    return migrateLedgerState({
      ...(backup?.state || {}),
      signedIn: true,
      googleUser: session.googleUser || {},
      googleAccessToken: session.firebaseIdToken || session.accessToken || '',
      googleIdToken: session.googleIdToken || '',
      googleRefreshToken: session.firebaseRefreshToken || '',
      firebaseUid: session.firebaseUid || session.googleUser?.firebaseUid || '',
      googleBackup: {
        status: 'synced',
        lastRestoreAt: restoredAt,
        lastBackupAt: modifiedTime,
        modifiedTime,
        fileId: 'cloudflare-kv',
        schema: backup?.schema || 1,
        error: '',
        lastReason: session.reason || 'restore',
        firebaseExpiresIn: session.firebaseExpiresIn || 3600,
        firebaseTokenIssuedAt: session.firebaseTokenIssuedAt || Date.now()
      },
      preferences: {
        ...((backup?.state || {}).preferences || {}),
        autoGoogleBackup: (latestStateRef.current || state).preferences?.autoGoogleBackup === true
      }
    });
  }

  async function runFirebaseKvWithFreshToken(action, reason = 'manual') {
    let token = await refreshFirebaseToken(false);
    try {
      return await action(token);
    } catch (error) {
      if (!isFirebaseAuthError(error)) throw error;
      token = await refreshFirebaseToken(true);
      return action(token);
    }
  }

  async function saveFirebaseKvBackupWithToken(firebaseIdToken, sourceState = state, sourceAccounts = accounts, reason = 'manual') {
    const result = await backupToCloudflareWorker({ firebaseIdToken, state: sourceState, accounts: sourceAccounts });
    const savedAt = result?.savedAt || new Date().toISOString();
    setState((prev) => ({
      ...prev,
      googleBackup: {
        ...(prev.googleBackup || {}),
        status: 'synced',
        lastBackupAt: savedAt,
        fileId: result?.key || 'cloudflare-kv',
        modifiedTime: result?.modifiedTime || savedAt,
        error: '',
        lastReason: reason
      },
      cloudBackups: {
        ...(prev.cloudBackups || {}),
        cloudflare: {
          ...((prev.cloudBackups || {}).cloudflare || {}),
          status: 'synced',
          lastBackupAt: savedAt,
          fileName: result?.fileName || 'Cloudflare KV backup',
          error: ''
        }
      }
    }));
    return result;
  }

  async function loginWithGoogle() {
    if (!GOOGLE_BACKUP_ENABLED) return showGoogleDeveloperMessage();
    try {
      const user = await signInWithGoogle();
      const baseState = latestStateRef.current || state;
      const nextGoogleUser = googleUserFromAuthUser(user);
      const nextStateForBackup = buildFirebaseSessionState(baseState, user, 'checking');

      setState(nextStateForBackup);
      notify('Firebase Google account connected', 'ti-brand-google');

      try {
        setState((prev) => ({ ...prev, googleBackup: { ...(prev.googleBackup || {}), status: 'restoring', error: '' } }));
        const backup = await restoreFromCloudflareWorker({ firebaseIdToken: user.firebaseIdToken });
        const restored = buildRestoredFirebaseKvState(backup, {
          googleUser: nextGoogleUser,
          firebaseIdToken: user.firebaseIdToken,
          firebaseRefreshToken: user.firebaseRefreshToken || '',
          firebaseUid: user.firebaseUid || user.uid || '',
          firebaseExpiresIn: user.firebaseExpiresIn || 3600,
          firebaseTokenIssuedAt: user.firebaseTokenIssuedAt || Date.now(),
          googleIdToken: user.googleIdToken || '',
          reason: 'login-restore'
        });
        setState(restored);
        notify('Cloudflare KV backup loaded', 'ti-cloud-download');
        return { ...user, restoredBackup: true, backup };
      } catch (backupError) {
        if (!isNoCloudflareBackupError(backupError)) {
          const message = backupError?.message || 'Cloudflare KV restore failed';
          console.error('Cloudflare KV backup check failed', backupError);
          setState((prev) => ({
            ...prev,
            googleBackup: { ...(prev.googleBackup || {}), status: 'error', error: message }
          }));
          notify(`Google connected. ${message}`, 'ti-alert-circle');
          return user;
        }

        if (baseState.preferences?.autoGoogleBackup === false) {
          setState((prev) => ({
            ...prev,
            googleBackup: { ...(prev.googleBackup || {}), status: 'ready', error: '', lastReason: 'login-no-backup' }
          }));
          notify('No KV backup found. Google connected.', 'ti-cloud-off');
          return user;
        }

        setState((prev) => ({ ...prev, googleBackup: { ...(prev.googleBackup || {}), status: 'uploading', error: '' } }));
        await saveFirebaseKvBackupWithToken(user.firebaseIdToken, nextStateForBackup, accounts, 'first-login-no-backup');
        notify('No KV backup found. New backup saved', 'ti-cloud-check');
        return user;
      }
    } catch (error) {
      console.error('Firebase Google login failed', error);
      const message = error?.message || 'Firebase Google login failed';
      setState((prev) => ({
        ...prev,
        googleBackup: { ...(prev.googleBackup || {}), status: 'error', error: message }
      }));
      notify(message, 'ti-alert-circle');
      throw error;
    }
  }

  async function logoutGoogle() {
    if (!GOOGLE_BACKUP_ENABLED) return showGoogleDeveloperMessage();
    await signOutGoogle();
    setState((prev) => ({
      ...prev,
      signedIn: false,
      googleUser: null,
      googleAccessToken: '',
      googleIdToken: '',
      googleRefreshToken: '',
      firebaseUid: '',
      googleBackup: {
        ...(prev.googleBackup || {}),
        status: 'signed-out'
      }
    }));
    notify('Google account signed out', 'ti-logout');
  }

  async function toggleSignedIn() {
    if (state.signedIn) return logoutGoogle();
    return loginWithGoogle();
  }

  async function backupToFirebaseKv() {
    if (!GOOGLE_BACKUP_ENABLED) return showGoogleDeveloperMessage();
    try {
      if (!state.signedIn || !state.googleAccessToken) {
        await loginWithGoogle();
        return null;
      }
      setState((prev) => ({ ...prev, googleBackup: { ...(prev.googleBackup || {}), status: 'uploading', error: '' } }));
      const result = await runFirebaseKvWithFreshToken((token) => saveFirebaseKvBackupWithToken(token, latestStateRef.current || state, accounts, 'manual'), 'manual');
      notify('Cloudflare KV backup saved', 'ti-cloud-check');
      return result;
    } catch (error) {
      console.error('Cloudflare KV backup failed', error);
      setState((prev) => ({ ...prev, googleBackup: { ...(prev.googleBackup || {}), status: 'error', error: error?.message || 'Backup failed' } }));
      notify(error?.message || 'Cloudflare KV backup failed', 'ti-alert-circle');
      throw error;
    }
  }

  async function restoreFromFirebaseKv() {
    if (!GOOGLE_BACKUP_ENABLED) return showGoogleDeveloperMessage();
    try {
      let backup = null;
      let session = {
        googleUser: state.googleUser || {},
        firebaseIdToken: state.googleAccessToken || '',
        firebaseRefreshToken: state.googleRefreshToken || '',
        firebaseUid: state.firebaseUid || state.googleUser?.firebaseUid || '',
        reason: 'manual-restore'
      };

      if (!state.signedIn || !state.googleAccessToken) {
        const user = await signInWithGoogle();
        const baseState = latestStateRef.current || state;
        const nextGoogleUser = googleUserFromAuthUser(user);
        session = {
          googleUser: nextGoogleUser,
          firebaseIdToken: user.firebaseIdToken,
          firebaseRefreshToken: user.firebaseRefreshToken || '',
          firebaseUid: user.firebaseUid || user.uid || '',
          firebaseExpiresIn: user.firebaseExpiresIn || 3600,
          firebaseTokenIssuedAt: user.firebaseTokenIssuedAt || Date.now(),
          googleIdToken: user.googleIdToken || '',
          reason: 'manual-login-restore'
        };
        setState(buildFirebaseSessionState(baseState, user, 'restoring'));
        notify('Firebase Google account connected', 'ti-brand-google');
        backup = await restoreFromCloudflareWorker({ firebaseIdToken: user.firebaseIdToken });
      } else {
        setState((prev) => ({ ...prev, googleBackup: { ...(prev.googleBackup || {}), status: 'restoring', error: '' } }));
        let restoredToken = '';
        backup = await runFirebaseKvWithFreshToken((token) => {
          restoredToken = token;
          return restoreFromCloudflareWorker({ firebaseIdToken: token });
        }, 'restore');
        session = {
          googleUser: state.googleUser || {},
          firebaseIdToken: restoredToken || state.googleAccessToken,
          firebaseRefreshToken: state.googleRefreshToken || '',
          firebaseUid: state.firebaseUid || state.googleUser?.firebaseUid || '',
          reason: 'manual-restore'
        };
      }

      const restored = buildRestoredFirebaseKvState(backup, session);
      setState(restored);
      notify('Cloudflare KV backup restored', 'ti-cloud-download');
      return backup;
    } catch (error) {
      console.error('Cloudflare KV restore failed', error);
      setState((prev) => ({ ...prev, googleBackup: { ...(prev.googleBackup || {}), status: 'error', error: error?.message || 'Restore failed' } }));
      notify(error?.message || 'Cloudflare KV restore failed', 'ti-alert-circle');
      throw error;
    }
  }

  function toggleAutoGoogleBackup() {
    if (!GOOGLE_BACKUP_ENABLED) return showGoogleDeveloperMessage();
    const nextValue = state.preferences?.autoGoogleBackup !== true;
    setState((prev) => ({
      ...prev,
      preferences: {
        ...(prev.preferences || {}),
        autoGoogleBackup: nextValue,
        selectedCloudBackupProvider: 'cloudflare',
        autoCloudBackupEnabled: false,
        autoCloudBackupProvider: ''
      }
    }));
    notify(nextValue ? 'Auto Firebase KV backup enabled' : 'Auto Firebase KV backup disabled', nextValue ? 'ti-cloud-check' : 'ti-cloud-off');
  }

  function setCloudBackupStatus(provider, patch = {}) {
    setState((prev) => ({
      ...prev,
      cloudBackups: {
        ...(prev.cloudBackups || {}),
        [provider]: {
          ...((prev.cloudBackups || {})[provider] || {}),
          ...patch
        }
      }
    }));
  }

  function backupToCloudflareBackup() {
    return backupToFirebaseKv();
  }

  function restoreFromCloudflareBackup() {
    return restoreFromFirebaseKv();
  }

  function selectCloudBackupProvider() {
    setState((prev) => ({
      ...prev,
      preferences: {
        ...(prev.preferences || {}),
        selectedCloudBackupProvider: 'cloudflare',
        autoCloudBackupEnabled: false,
        autoCloudBackupProvider: ''
      }
    }));
    notify('Cloudflare KV is the only cloud backup method', 'ti-brand-cloudflare');
  }

  function toggleAutoCloudBackup() {
    return toggleAutoGoogleBackup();
  }

  function toggleAutoCloudBackupProvider() {
    return selectCloudBackupProvider();
  }

  function toggleAutoLocalBackup() {
    const nextValue = state.preferences?.autoLocalBackup !== true;
    setState((prev) => ({
      ...prev,
      preferences: {
        ...(prev.preferences || {}),
        autoLocalBackup: nextValue
      }
    }));
    notify(nextValue ? 'Auto local backup enabled' : 'Auto local backup disabled', nextValue ? 'ti-device-floppy' : 'ti-toggle-left');
    if (nextValue) {
      setTimeout(() => {
        backupToAutomaticLocalStorage({ silent: true }).catch(() => {});
      }, 150);
    }
  }

  async function backupToAutomaticLocalStorage(options = {}) {
    try {
      const sourceState = latestStateRef.current || state;
      const result = await saveAutomaticLocalBackup(sourceState, accounts);
      setState((prev) => ({
        ...prev,
        localBackup: {
          ...(prev.localBackup || {}),
          status: 'synced',
          lastAutoBackupAt: result.savedAt,
          fileName: result.fileName || result.filename || 'CashNest-X-auto-local-backup.cnbak',
          path: result.path || prev.localBackup?.path || '',
          error: ''
        }
      }));
      if (!options.silent) notify('Encrypted auto local backup saved to Documents', 'ti-device-floppy');
      return result;
    } catch (error) {
      const message = error?.message || 'Auto local backup failed';
      setState((prev) => ({ ...prev, localBackup: { ...(prev.localBackup || {}), status: 'error', error: message } }));
      if (!options.silent) notify(message, 'ti-alert-circle');
      throw error;
    }
  }

  async function backupToLocalFile() {
    const label = 'Local backup';
    try {
      setState((prev) => ({ ...prev, localBackup: { ...(prev.localBackup || {}), status: 'saving', error: '' } }));
      const sourceState = latestStateRef.current || state;
      const result = await saveManualLocalBackup(sourceState, accounts);
      const fileName = result?.filename || result?.fileName || 'CashNest-X-Encrypted-Backup.cnbak';
      const appNotification = createNotification({
        title: `${label} saved`,
        desc: `${fileName} encrypted and saved in Documents/CashNest X. Existing backup was replaced.`,
        icon: 'ti-device-floppy',
        color: 'green',
        type: 'localBackup',
        action: 'settings'
      });
      setState((prev) => ({
        ...prev,
        localBackup: {
          ...(prev.localBackup || {}),
          status: 'saved',
          lastManualBackupAt: result.savedAt,
          fileName,
          path: result.path || prev.localBackup?.path || '',
          error: ''
        },
        notifications: prev.preferences?.notifications === false ? (prev.notifications || []) : [appNotification, ...(prev.notifications || [])].slice(0, 60)
      }));
      notify('Encrypted local backup saved to Documents', 'ti-device-floppy');
      showMobileNotification(state.preferences?.notifications !== false, 'Encrypted backup saved', `${fileName} saved to Documents/CashNest X`, {
        type: 'localBackup',
        color: 'green',
        screen: 'settings',
        appNotificationId: appNotification.id,
        tag: 'cashnest_x-local-backup',
        fileName,
        fileUri: result?.uri || '',
        filePath: result?.path || '',
        mimeType: result?.mimeType || 'application/octet-stream'
      });
      return result;
    } catch (error) {
      const message = error?.message || 'Local backup failed';
      setState((prev) => ({ ...prev, localBackup: { ...(prev.localBackup || {}), status: 'error', error: message } }));
      notify(message, 'ti-alert-circle');
      throw error;
    }
  }

  async function restoreFromLocalBackupFile(file) {
    try {
      setState((prev) => ({ ...prev, localBackup: { ...(prev.localBackup || {}), status: 'restoring', error: '' } }));
      const { restored } = await parseLocalBackupFile(file);
      const restoredAt = new Date().toISOString();
      const nextState = {
        ...restored,
        localBackup: {
          ...(restored.localBackup || {}),
          status: 'restored',
          lastRestoreAt: restoredAt,
          fileName: file?.name || restored.localBackup?.fileName || 'Local backup',
          error: ''
        }
      };
      setState(nextState);
      notify('Encrypted local backup restored', 'ti-device-floppy');
      return nextState;
    } catch (error) {
      const message = error?.message || 'Local backup restore failed';
      setState((prev) => ({ ...prev, localBackup: { ...(prev.localBackup || {}), status: 'error', error: message } }));
      notify(message, 'ti-alert-circle');
      throw error;
    }
  }

  function markAllRead() {
    setState((prev) => ({ ...prev, notifications: prev.notifications.map((n) => ({ ...n, read: true })) }));
    notify('All notifications marked as read', 'ti-bell-check');
  }




  function deleteReadNotifications() {
    setState((prev) => ({
      ...prev,
      notifications: (prev.notifications || []).filter((n) => !n.read),
      archivedNotifications: prev.archivedNotifications || []
    }));
    notify('Read notifications deleted', 'ti-trash');
  }

  function deleteAllNotifications() {
    setState((prev) => ({
      ...prev,
      notifications: [],
      archivedNotifications: []
    }));
    notify('Notifications cleared', 'ti-trash');
  }

  function markNotificationRead(id) {
    setState((prev) => ({
      ...prev,
      notifications: (prev.notifications || []).map((n) => n.id === id ? { ...n, read: true } : n)
    }));
  }

  function archiveNotification(id) {
    setState((prev) => {
      const item = (prev.notifications || []).find((n) => n.id === id);
      return {
        ...prev,
        notifications: (prev.notifications || []).filter((n) => n.id !== id),
        archivedNotifications: item ? [{ ...item, read: true, archived: true, archivedAt: Date.now() }, ...(prev.archivedNotifications || [])].slice(0, 80) : (prev.archivedNotifications || [])
      };
    });
    notify('Notification archived', 'ti-archive');
  }

  function unarchiveNotification(id) {
    setState((prev) => {
      const item = (prev.archivedNotifications || []).find((n) => n.id === id);
      return {
        ...prev,
        archivedNotifications: (prev.archivedNotifications || []).filter((n) => n.id !== id),
        notifications: item ? [{ ...item, archived: false, restoredAt: Date.now() }, ...(prev.notifications || [])].slice(0, 60) : (prev.notifications || [])
      };
    });
    notify('Notification restored', 'ti-archive-off');
  }

  function deleteNotification(id, archived = false) {
    setState((prev) => ({
      ...prev,
      notifications: archived ? (prev.notifications || []) : (prev.notifications || []).filter((n) => n.id !== id),
      archivedNotifications: archived ? (prev.archivedNotifications || []).filter((n) => n.id !== id) : (prev.archivedNotifications || [])
    }));
    notify('Notification deleted', 'ti-trash');
  }

  function resetAll() {
    setState({ ...defaultState, theme: state.theme, accentColor: state.accentColor || 'blue', currency: state.currency || 'LKR', preferences: state.preferences || defaultState.preferences });
    notify('All data reset to zero', 'ti-refresh');
  }

  function notifyReleaseAvailable(update = {}) {
    const version = update.latestVersion || update.release?.tag_name || 'new version';
    const title = 'New release available';
    const desc = `CashNest X v${version} is ready to download.`;
    const appNotification = createNotification({
      title,
      desc,
      icon: 'ti-download',
      color: 'green',
      type: 'release',
      action: 'update'
    });
    setState((prev) => {
      if (prev.preferences?.notifications === false) return prev;
      const exists = (prev.notifications || []).some((item) => item.type === 'release' && item.desc === desc);
      if (exists) return prev;
      return { ...prev, notifications: [appNotification, ...(prev.notifications || [])].slice(0, 60) };
    });
    showMobileNotification(state.preferences?.notifications !== false, title, desc, {
      type: 'release',
      color: 'green',
      summary: 'CashNest X update ready',
      screen: 'updates',
      appNotificationId: appNotification.id,
      tag: `cashnest_x-release-${version}`
    });
  }

  async function exportData(format = 'json', options = {}) {
    const label = format === 'csv' ? 'CSV file' : format === 'xls' ? 'Excel file' : format === 'pdf' ? 'PDF report' : format === 'md' ? 'Markdown report' : 'JSON backup';
    try {
      const exportTotals = buildConvertedAllTotals(accounts, state.transactions, state.currency || 'LKR', options.rates);
      const result = await exportLedgerData(format, state, accounts, exportTotals, options);
      const fileName = result?.filename || result?.fileName || `${label} file`;
      const folder = 'Documents/CashNest X';
      const appNotification = createNotification({
        title: `${label} saved`,
        desc: `${fileName} saved in ${folder}.`,
        icon: 'ti-download',
        color: 'green',
        type: 'export',
        action: 'settings'
      });
      setState((prev) => ({
        ...prev,
        notifications: (prev.preferences?.notifications === false ? (prev.notifications || []) : [appNotification, ...(prev.notifications || [])].slice(0, 60))
      }));
      notify(`${label} saved to Documents`, 'ti-download');
      showMobileNotification(state.preferences?.notifications !== false, `${label} saved`, `${fileName} saved to Documents/CashNest X`, {
        type: 'export',
        color: 'green',
        summary: 'Export saved to Documents',
        screen: 'export-file',
        appNotificationId: appNotification.id,
        tag: `cashnest_x-export-${format}`,
        fileName,
        fileUri: result?.uri || '',
        filePath: result?.path || '',
        mimeType: result?.mimeType || (format === 'csv' ? 'text/csv' : format === 'xls' ? 'application/vnd.ms-excel' : format === 'pdf' ? 'application/pdf' : format === 'md' ? 'text/markdown' : 'application/json')
      });
      return { ...result, filename: fileName, label, folder };
    } catch (error) {
      console.error('Export failed', error);
      notify(`${label} export failed`, 'ti-alert-circle');
      throw error;
    }
  }

  function exportJson() {
    exportData('json');
  }

  return {
    state,
    categories,
    visibleCategories,
    accounts,
    totals,
    toast,
    notify,
    completeOnboarding,
    addAccount,
    updateAccount,
    deleteAccount,
    addCategory,
    deleteCategory,
    toggleCategoryEnabled,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    addLoan,
    updateLoan,
    deleteLoan,
    addLoanPayment,
    updateLoanPayment,
    deleteLoanPayment,
    markLoanPaid,
    addBudget,
    deleteBudget,
    setCurrency,
    toggleNotifications,
    toggleTransactionSounds,
    toggleCompactNumbers,
    toggleAutoGoogleBackup,
    showGoogleDeveloperMessage,
    backupToCloudflareBackup,
    restoreFromCloudflareBackup,
    selectCloudBackupProvider,
    toggleAutoCloudBackup,
    toggleAutoCloudBackupProvider,
    toggleAutoLocalBackup,
    backupToLocalFile,
    restoreFromLocalBackupFile,
    toggleBiometricLock,
    setPinLock,
    removePinLock,
    verifyPin,
    biometricUnlock,
    toggleTheme,
    setAccentColor,
    toggleSignedIn,
    loginWithGoogle,
    logoutGoogle,
    backupToFirebaseKv,
    restoreFromFirebaseKv,
    markAllRead,
    markNotificationRead,
    deleteReadNotifications,
    deleteAllNotifications,
    archiveNotification,
    unarchiveNotification,
    deleteNotification,
    resetAll,
    exportJson,
    exportData
  };
}
