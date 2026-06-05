import { useEffect, useMemo, useState } from 'react';
import { categoryInfo, colorVar } from '../models/categories';
import { formatMoneyForCurrency } from '../utils/currency';
import { getTransactionCurrency, resolveAccountCurrency, sumTransactionsInCurrency } from '../utils/accountViewTotals';
import ConvertedMainAmount from '../components/ConvertedMainAmount';
import LoanCurrencyStack from '../components/LoanCurrencyStack';
import OptionPickerModal from '../modals/OptionPickerModal';
import { formatCalendarDate } from '../modals/DateCalendarModal';
import RecordDateFilterModal from '../modals/RecordDateFilterModal';
import ConfirmModal from '../modals/ConfirmModal';
import { isAccountHidden, isTransactionVisibleForAccountFilter } from '../utils/transactionFilters';
import { formatRecordDateFilter, isDateInRecordRange } from '../utils/dateRangeFilter';
import { convertBudgetLimit, formatLoanAmount, formatConvertedLoanAmount, getBudgetSpentInCurrency, shouldShowLoanConvertedLine, sumBudgetLimitsInCurrency, sumLoansInCurrency } from '../utils/loanBudgetCurrency';
import { getTransferDisplayAmount } from '../utils/transferCurrency';
import HiddenAccountBadge from '../components/HiddenAccountBadge';
import { buildRecordTransactions } from '../utils/recordTransactions';

export default function Records({ ledger, openAdd, openLoan, openBudget, openCategory, openTransaction, openLoanDetails, conversionRates }) {
  const [mode, setMode] = useState('transactions');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [accountFilter, setAccountFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState({ mode: 'all' });
  const [dateFilterOpen, setDateFilterOpen] = useState(false);
  const [deleteBudgetConfirm, setDeleteBudgetConfirm] = useState(null);
  const [picker, setPicker] = useState(null);

  useEffect(() => {
    const handleMode = (event) => {
      if (['transactions', 'loans', 'budgets'].includes(event.detail)) setMode(event.detail);
    };
    window.addEventListener('cashnest_x:records-mode', handleMode);
    return () => window.removeEventListener('cashnest_x:records-mode', handleMode);
  }, []);

  const q = query.trim().toLowerCase();
  const budgets = ledger.state.budgets || [];
  const recordTransactions = useMemo(() => buildRecordTransactions(ledger.state.transactions, ledger.accounts), [ledger.state.transactions, ledger.accounts]);
  const enabledRecordCategories = useMemo(() => {
    const enabled = ledger.visibleCategories || ledger.categories || [];
    return enabled.length ? enabled : [];
  }, [ledger.visibleCategories, ledger.categories]);

  const categoryFilters = useMemo(() => [
    { value: 'All', label: 'All Categories', icon: 'ti-list-search', color: 'accent', subtitle: 'Show every transaction' },
    { value: 'Income', label: 'Income', icon: 'ti-trending-up', color: 'green', subtitle: 'Money received' },
    { value: 'Transfer', label: 'Transfer', icon: 'ti-arrows-exchange', color: 'accent', subtitle: 'Account to account' },
    { value: 'Loan', label: 'Loan', icon: 'ti-clock-dollar', color: 'amber', subtitle: 'Loan records' },
    ...enabledRecordCategories.map((item) => ({ value: item.name, label: item.name, icon: item.icon, color: item.color }))
  ], [enabledRecordCategories]);

  useEffect(() => {
    if (category === 'All') return;
    const stillVisible = categoryFilters.some((item) => item.value === category);
    if (!stillVisible) setCategory('All');
  }, [category, categoryFilters]);

  const filteredTransactions = useMemo(() => {
    return recordTransactions.filter((tx) => {
      const fromName = ledger.accounts.find((a) => a.id === tx.fromAccountId)?.name || '';
      const toName = ledger.accounts.find((a) => a.id === tx.toAccountId)?.name || '';
      const haystack = [tx.title, tx.category, tx.accountName, fromName, toName, tx.type, tx.amount].join(' ').toLowerCase();
      const queryOk = !q || haystack.includes(q);
      const categoryOk = category === 'All' || tx.category === category || tx.type === category.toLowerCase() || (category === 'Loan' && (tx.category || '').toLowerCase().includes('loan'));
      const accountOk = isTransactionVisibleForAccountFilter(tx, ledger.accounts, accountFilter);
      const dateOk = isDateInRecordRange(tx.dateValue, dateFilter);
      return queryOk && categoryOk && accountOk && dateOk;
    });
  }, [recordTransactions, ledger.accounts, q, category, accountFilter, dateFilter]);

  const filteredLoans = useMemo(() => {
    return ledger.state.loans.filter((loan) => {
      const hiddenAccount = isAccountHidden(ledger.accounts, loan.accountId);
      if (hiddenAccount) return false;
      const haystack = [loan.person, loan.type, loan.amount, loan.paid, loan.due, loan.dueDateValue, loan.status, loan.note].join(' ').toLowerCase();
      return !q || haystack.includes(q);
    });
  }, [ledger.state.loans, ledger.accounts, q]);

  const filteredBudgets = useMemo(() => {
    return budgets.filter((budget) => {
      const haystack = [budget.name, budget.category, budget.amount, budget.period, budget.note].join(' ').toLowerCase();
      return !q || haystack.includes(q);
    });
  }, [budgets, q]);

  const selectedFilterCurrency = accountFilter === 'All' ? ledger.state.currency : resolveAccountCurrency(ledger.accounts, accountFilter, ledger.state.currency);
  const incomeTotal = sumTransactionsInCurrency(filteredTransactions, ledger.accounts, 'income', selectedFilterCurrency, conversionRates);
  const expenseTotal = sumTransactionsInCurrency(filteredTransactions, ledger.accounts, 'expense', selectedFilterCurrency, conversionRates);
  const loanTotal = sumLoansInCurrency(filteredLoans, '', ledger.state.currency, conversionRates);
  const lendingTotal = sumLoansInCurrency(filteredLoans, 'Lending', ledger.state.currency, conversionRates);
  const borrowingTotal = sumLoansInCurrency(filteredLoans, 'Borrowing', ledger.state.currency, conversionRates);
  const budgetLimitTotal = sumBudgetLimitsInCurrency(filteredBudgets, ledger.state.currency, conversionRates);
  const budgetSpentTotal = filteredBudgets.reduce((sum, budget) => sum + getBudgetSpentInCurrency({ transactions: ledger.state.transactions, accounts: ledger.accounts, category: budget.category, targetCurrency: ledger.state.currency, rates: conversionRates }), 0);
  const selectedCategory = categoryFilters.find((item) => item.value === category) || categoryFilters[0];
  const accountOptions = [
    { value: 'All', label: 'All Accounts', icon: 'ti-wallet', color: 'accent', subtitle: 'Visible accounts only' },
    ...ledger.accounts.map((account) => ({ value: account.id, label: account.name, icon: account.type === 'Bank Account' || account.type === 'Savings Account' ? 'ti-building-bank' : account.type === 'Mobile Wallet' ? 'ti-device-mobile-dollar' : 'ti-wallet', color: account.color || 'accent', subtitle: `${formatMoneyForCurrency(account.balance || 0, account.currency || ledger.state.currency, { decimals: 0 })}${account.hideFromTotal ? ' • Hidden from total' : ''}` }))
  ];
  const selectedAccount = accountOptions.find((item) => item.value === accountFilter) || accountOptions[0];
  const selectedDateLabel = formatRecordDateFilter(dateFilter, formatCalendarDate);

  function searchPlaceholder() {
    if (mode === 'transactions') return 'Search transactions...';
    if (mode === 'loans') return 'Search loans...';
    return 'Search budgets...';
  }

  return (
    <div className="screen active">
      <div className="screen-header">
        <div>
          <div style={{ fontSize: 12, color: 'var(--text3)' }}>Search, filter, open details</div>
          <div className="screen-title">Records</div>
        </div>
      </div>

      <div className="scroll-area records-scroll">
        <div className="records-segment records-segment-three">
          <button className={mode === 'transactions' ? 'active' : ''} type="button" onClick={() => setMode('transactions')}><i className="ti ti-receipt" /> Transactions</button>
          <button className={mode === 'loans' ? 'active' : ''} type="button" onClick={() => setMode('loans')}><i className="ti ti-clock-dollar" /> Loans</button>
          <button className={mode === 'budgets' ? 'active' : ''} type="button" onClick={() => setMode('budgets')}><i className="ti ti-target" /> Budgets</button>
        </div>

        <div className="records-search">
          <i className="ti ti-search" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={searchPlaceholder()} />
          {query && <button type="button" onClick={() => setQuery('')}><i className="ti ti-x" /></button>}
        </div>

        {mode === 'transactions' && (
          <>
            <div className="summary-row records-summary compact-summary">
              <div className="sum-card"><div className="sum-val" style={{ color: 'var(--green)' }}>{formatMoneyForCurrency(incomeTotal, selectedFilterCurrency, { decimals: 0 })}</div><div className="sum-lbl">Income</div></div>
              <div className="sum-card"><div className="sum-val" style={{ color: 'var(--red)' }}>{formatMoneyForCurrency(expenseTotal, selectedFilterCurrency, { decimals: 0 })}</div><div className="sum-lbl">Expenses</div></div>
              <div className="sum-card"><div className="sum-val" style={{ color: 'var(--accent)' }}>{filteredTransactions.length}</div><div className="sum-lbl">Results</div></div>
            </div>

            <div className="filter-row filter-row-buttons record-filter-grid">
              <button className="filter-picker-btn" type="button" onClick={() => setPicker('category')} aria-label="Category filter">
                <span className="filter-icon" style={{ color: colorVar(selectedCategory.color), background: `color-mix(in srgb, ${colorVar(selectedCategory.color)} 14%, transparent)` }}><i className={`ti ${selectedCategory.icon}`} /></span>
                <span className="filter-copy"><small>Category</small><b>{selectedCategory.label}</b></span>
                <i className="ti ti-chevron-down filter-chevron" />
              </button>
              <button className="filter-picker-btn" type="button" onClick={() => setPicker('account')} aria-label="Account filter">
                <span className="filter-icon" style={{ color: colorVar(selectedAccount.color), background: `color-mix(in srgb, ${colorVar(selectedAccount.color)} 14%, transparent)` }}><i className={`ti ${selectedAccount.icon}`} /></span>
                <span className="filter-copy"><small>Account</small><b>{selectedAccount.label}</b>{accountFilter !== 'All' && ledger.accounts.find((item) => item.id === accountFilter)?.hideFromTotal ? <HiddenAccountBadge hidden compact /> : null}</span>
                <i className="ti ti-chevron-down filter-chevron" />
              </button>
            </div>
            <div className="filter-row filter-row-one record-date-row">
              <button className="filter-picker-btn" type="button" onClick={() => setDateFilterOpen(true)} aria-label="Date view filter">
                <span className="filter-icon" style={{ color: 'var(--accent)', background: 'rgba(79,142,247,.14)' }}><i className="ti ti-calendar-stats" /></span>
                <span className="filter-copy"><small>Date View</small><b>{selectedDateLabel}</b></span>
                {dateFilter.mode !== 'all' ? <span className="filter-clear" onClick={(event) => { event.stopPropagation(); setDateFilter({ mode: 'all' }); }}><i className="ti ti-x" /></span> : <i className="ti ti-chevron-down filter-chevron" />}
              </button>
            </div>

            <button className="inline-create-btn records-inline-create" type="button" onClick={openCategory}><i className="ti ti-category-plus" /> Create category</button>
            {!filteredTransactions.length && <div className="empty-state">No matching transactions. Tap + to add one.</div>}
            {filteredTransactions.map((tx) => {
              const sign = tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : '';
              const cls = tx.type === 'income' ? 'inc' : tx.type === 'expense' ? 'exp' : '';
              const from = ledger.accounts.find((a) => a.id === tx.fromAccountId)?.name;
              const to = ledger.accounts.find((a) => a.id === tx.toAccountId)?.name;
              const currencyCode = getTransactionCurrency(tx, ledger.accounts, ledger.state.currency, accountFilter);
              const meta = tx.type === 'transfer' ? `${from || 'From'} → ${to || 'To'}` : `${tx.category} • ${tx.accountName || 'Cash Wallet'}`;
              return (
                <button className="tx-card tx-card-button" key={tx.id} type="button" onClick={() => { if (!tx.isReadOnlyRecord) openTransaction(tx); }}>
                  <div className="tx-icon" style={{ background: 'rgba(79,142,247,0.12)', color: colorVar(tx.color) }}><i className={`ti ${tx.icon}`} /></div>
                  <div className="tx-info"><div className="tx-name">{tx.title}</div><div className="tx-meta">{meta}</div></div>
                  <div className="tx-amount-wrap">
                    <div className={`tx-amount ${cls}`} style={tx.type === 'transfer' ? { color: 'var(--accent)' } : undefined}>{sign}{formatMoneyForCurrency(getTransferDisplayAmount(tx, ledger.accounts, accountFilter), currencyCode, { decimals: 0 })}</div>
                    <ConvertedMainAmount transaction={tx} accounts={ledger.accounts} appCurrency={ledger.state.currency} rates={conversionRates} activeAccountId={accountFilter} />
                  </div>
                </button>
              );
            })}
          </>
        )}

        {mode === 'loans' && (
          <>
            <div className="summary-row records-summary">
              <div className="sum-card"><div className="sum-val" style={{ color: 'var(--green)' }}>{formatMoneyForCurrency(lendingTotal, ledger.state.currency, { decimals: 0 })}</div><div className="sum-lbl">Lent</div></div>
              <div className="sum-card"><div className="sum-val" style={{ color: 'var(--red)' }}>{formatMoneyForCurrency(borrowingTotal, ledger.state.currency, { decimals: 0 })}</div><div className="sum-lbl">Owe</div></div>
              <div className="sum-card"><div className="sum-val" style={{ color: 'var(--amber)' }}>{filteredLoans.length}</div><div className="sum-lbl">Loans</div></div>
            </div>

            <button className="wide-action-btn" type="button" onClick={openLoan}><i className="ti ti-plus" /> Add Loan</button>
            {!filteredLoans.length && <div className="empty-state">No matching loans. Add through this page or Add Transaction → Loan.</div>}
            {filteredLoans.map((loan) => {
              const progress = loan.amount > 0 ? Math.min(100, Math.round((loan.paid / loan.amount) * 100)) : 0;
              const isLend = loan.type === 'Lending';
              return (
                <button className="loan-card loan-card-click" key={loan.id} type="button" onClick={() => openLoanDetails?.(loan)}>
                  <div className="loan-header">
                    <div className="loan-person"><div className="loan-avatar" style={{ background: isLend ? 'linear-gradient(135deg,#30d48a,#2dd4bf)' : 'linear-gradient(135deg,#f05c6e,#f5a623)' }}>{(loan.person || 'LN').slice(0, 2).toUpperCase()}</div><div><div className="loan-name">{loan.person}</div><div className="loan-type">{loan.note || (loan.dueDateValue ? `Due ${loan.due}` : 'No due date')}</div></div></div>
                    <span className={`loan-badge ${Math.max(0, loan.amount - loan.paid) <= 0 ? 'badge-lend paid-badge' : isLend ? 'badge-lend' : 'badge-borrow'}`}>{Math.max(0, loan.amount - loan.paid) <= 0 ? 'Paid' : loan.type}</span>
                  </div>
                  <div className="loan-amount-row">
                    <div className="loan-amount" style={{ color: isLend ? 'var(--green)' : 'var(--red)' }}>{formatLoanAmount(loan, 'amount', ledger.state.currency, { decimals: 0 })}</div>
                    <span className="loan-pay-chip"><i className="ti ti-cash" /> Pay</span>
                  </div>
                  <div className="loan-progress"><div className="loan-bar" style={{ width: `${progress}%`, background: Math.max(0, loan.amount - loan.paid) <= 0 ? 'var(--green)' : isLend ? 'var(--green)' : 'var(--red)' }} /></div>
                  <div className="loan-meta"><span>Paid: {formatLoanAmount(loan, 'paid', ledger.state.currency, { decimals: 0 })}</span><span className="loan-meta-stack">Remaining: <LoanCurrencyStack amount={Math.max(0, Number(loan.amount || 0) - Number(loan.paid || 0))} currency={loan.currency || ledger.state.currency} appCurrency={ledger.state.currency} rates={conversionRates} /></span></div>
                  {shouldShowLoanConvertedLine(loan, ledger.state.currency) && <div className="converted-main-amount loan-converted-line">{formatConvertedLoanAmount(loan, 'amount', ledger.state.currency, conversionRates, { decimals: 0 })}</div>}
                </button>
              );
            })}
          </>
        )}

        {mode === 'budgets' && (
          <>
            <div className="summary-row records-summary">
              <div className="sum-card"><div className="sum-val" style={{ color: 'var(--accent)' }}>{formatMoneyForCurrency(budgetLimitTotal, ledger.state.currency, { decimals: 0 })}</div><div className="sum-lbl">Limit</div></div>
              <div className="sum-card"><div className="sum-val" style={{ color: 'var(--red)' }}>{formatMoneyForCurrency(budgetSpentTotal, ledger.state.currency, { decimals: 0 })}</div><div className="sum-lbl">Spent</div></div>
              <div className="sum-card"><div className="sum-val" style={{ color: 'var(--pink)' }}>{filteredBudgets.length}</div><div className="sum-lbl">Budgets</div></div>
            </div>

            <div className="records-action-row"><button className="wide-action-btn" type="button" onClick={openBudget}><i className="ti ti-plus" /> Add Budget</button><button className="wide-action-btn secondary" type="button" onClick={openCategory}><i className="ti ti-category-plus" /> Category</button></div>
            {!filteredBudgets.length && <div className="empty-state">No budgets yet. Add category limits like Food, Shopping, Transport.</div>}
            {filteredBudgets.map((budget) => {
              const info = categoryInfo(budget.category, 'expense', ledger.categories);
              const spent = getBudgetSpentInCurrency({ transactions: ledger.state.transactions, accounts: ledger.accounts, category: budget.category, targetCurrency: ledger.state.currency, rates: conversionRates });
              const limit = convertBudgetLimit(budget, ledger.state.currency, conversionRates);
              const progress = limit > 0 ? Math.min(100, Math.round((spent / limit) * 100)) : 0;
              const danger = progress >= 100;
              return (
                <div className="budget-card" key={budget.id}>
                  <div className="budget-card-head">
                    <div className="budget-title-wrap">
                      <span className="budget-icon" style={{ color: colorVar(info.color), background: `color-mix(in srgb, ${colorVar(info.color)} 14%, transparent)` }}><i className={`ti ${info.icon}`} /></span>
                      <div><div className="budget-name">{budget.name || `${budget.category} Budget`}</div><div className="budget-sub">{budget.category} • {budget.period} • {budget.currency || ledger.state.currency}</div></div>
                    </div>
                    <button className="mini-danger-btn" type="button" onClick={() => setDeleteBudgetConfirm(budget)}><i className="ti ti-trash" /></button>
                  </div>
                  <div className="budget-values"><span>{formatMoneyForCurrency(spent, ledger.state.currency, { decimals: 0 })} spent</span><b>{formatMoneyForCurrency(limit, ledger.state.currency, { decimals: 0 })}</b></div>
                  <div className="loan-progress"><div className="loan-bar" style={{ width: `${progress}%`, background: danger ? 'var(--red)' : colorVar(info.color) }} /></div>
                  <div className="loan-meta"><span>{progress}% used</span><span>Left: {formatMoneyForCurrency(Math.max(0, limit - spent), ledger.state.currency, { decimals: 0 })}</span></div>
                </div>
              );
            })}
          </>
        )}
      </div>

      <ConfirmModal
        open={!!deleteBudgetConfirm}
        title="Delete budget?"
        message={`This will permanently delete “${deleteBudgetConfirm?.name || deleteBudgetConfirm?.category || 'this budget'}”. This cannot be undone.`}
        dangerLabel="Delete Budget"
        cancelLabel="Keep"
        icon="ti-trash"
        onCancel={() => setDeleteBudgetConfirm(null)}
        onConfirm={() => { if (deleteBudgetConfirm?.id) ledger.deleteBudget(deleteBudgetConfirm.id); setDeleteBudgetConfirm(null); }}
      />

      <RecordDateFilterModal open={dateFilterOpen} value={dateFilter} onApply={setDateFilter} close={() => setDateFilterOpen(false)} />
      <OptionPickerModal open={picker === 'category'} title="Filter by Category" options={categoryFilters} value={category} onSelect={setCategory} close={() => setPicker(null)} grid />
      <OptionPickerModal open={picker === 'account'} title="Filter by Account" options={accountOptions} value={accountFilter} onSelect={setAccountFilter} close={() => setPicker(null)} />
    </div>
  );
}
