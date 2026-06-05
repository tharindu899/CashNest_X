import { useMemo, useState } from 'react';
import { formatMoneyForCurrency } from '../utils/currency';
import { categoryInfo } from '../models/categories';
import CategoryDonutChart from '../components/CategoryDonutChart';
import CategoryExpenseWatch from '../components/CategoryExpenseWatch';
import DateCalendarModal, { formatCalendarDate, todayInputValue } from '../modals/DateCalendarModal';
import {
  buildCategoryTotals,
  buildLoanAwareAnalyticsTransactions,
  buildMonthlyIncomeExpenseTotals,
  getAnalyticsMonthKey,
  getConvertedBudgetSpent,
  getMonthTransactions,
  sumConvertedByType
} from '../utils/analyticsCurrencyTotals';
import { buildCategoryExpenseWatch } from '../utils/categoryExpenseWatch';
import { convertBudgetLimit } from '../utils/loanBudgetCurrency';
import { buildCurrentBalanceTotal } from '../utils/currentBalanceRates';

const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const monthShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function monthLabel(key) {
  const [year, month] = key.split('-').map(Number);
  return `${monthNames[month - 1]} ${year}`;
}

export default function Analytics({ ledger, conversionRates }) {
  const { state } = ledger;
  const appCurrency = state.currency || 'LKR';
  const [selectedDateValue, setSelectedDateValue] = useState(() => todayInputValue());
  const [pickerOpen, setPickerOpen] = useState(false);
  const [categoryMode, setCategoryMode] = useState('expense');
  const selectedMonth = getAnalyticsMonthKey(selectedDateValue);

  const analyticsTransactions = useMemo(
    () => buildLoanAwareAnalyticsTransactions(state.transactions || [], state.loans || [], ledger.accounts),
    [state.transactions, state.loans, ledger.accounts]
  );

  const monthTx = useMemo(
    () => getMonthTransactions(analyticsTransactions, ledger.accounts, selectedMonth),
    [analyticsTransactions, ledger.accounts, selectedMonth]
  );

  const income = useMemo(
    () => sumConvertedByType(monthTx, ledger.accounts, 'income', appCurrency, conversionRates),
    [monthTx, ledger.accounts, appCurrency, conversionRates]
  );
  const expenses = useMemo(
    () => sumConvertedByType(monthTx, ledger.accounts, 'expense', appCurrency, conversionRates),
    [monthTx, ledger.accounts, appCurrency, conversionRates]
  );
  const savings = useMemo(
    () => buildCurrentBalanceTotal(ledger.accounts, appCurrency, conversionRates),
    [ledger.accounts, appCurrency, conversionRates]
  );
  const incomeByCategory = useMemo(
    () => buildCategoryTotals(monthTx, ledger.accounts, appCurrency, conversionRates, 'income'),
    [monthTx, ledger.accounts, appCurrency, conversionRates]
  );
  const expenseByCategory = useMemo(
    () => buildCategoryTotals(monthTx, ledger.accounts, appCurrency, conversionRates, 'expense'),
    [monthTx, ledger.accounts, appCurrency, conversionRates]
  );
  const categoryTotal = categoryMode === 'income' ? income : expenses;
  const categories = Object.entries(categoryMode === 'income' ? incomeByCategory : expenseByCategory).sort((a, b) => b[1] - a[1]);
  const expenseWatch = useMemo(
    () => buildCategoryExpenseWatch({
      transactions: analyticsTransactions,
      accounts: ledger.accounts,
      selectedMonth,
      selectedDate: selectedDateValue,
      targetCurrency: appCurrency,
      rates: conversionRates
    }),
    [analyticsTransactions, ledger.accounts, selectedMonth, selectedDateValue, appCurrency, conversionRates]
  );

  const selectedDate = new Date(`${selectedMonth}-01T00:00:00`);
  const currentYear = selectedDate.getFullYear();
  const monthlyKeys = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(currentYear, selectedDate.getMonth() - 5 + i, 1);
    return { key: getAnalyticsMonthKey(d), label: monthShort[d.getMonth()] };
  });
  const monthlyTotals = useMemo(
    () => buildMonthlyIncomeExpenseTotals(analyticsTransactions, ledger.accounts, monthlyKeys, appCurrency, conversionRates),
    [analyticsTransactions, ledger.accounts, monthlyKeys.map((m) => m.key).join('|'), appCurrency, conversionRates]
  );
  const maxMonthTotal = Math.max(...monthlyTotals.map((m) => Math.max(m.income, m.expense)), 1);

  const selectedBudgets = (state.budgets || []).filter((budget) => {
    if (!budget.createdAt) return true;
    return getAnalyticsMonthKey(new Date(budget.createdAt)) <= selectedMonth;
  });

  return (
    <div className="screen active">
      <div className="screen-header">
        <div className="screen-title">Analytics</div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="icon-btn" type="button" onClick={() => setPickerOpen(true)} style={{ padding: '0 12px', width: 'auto', fontSize: 12, fontWeight: 700, color: 'var(--accent)' }}>{formatCalendarDate(selectedDateValue)}</button>
          <button className="icon-btn" type="button" onClick={() => setPickerOpen(true)}><i className="ti ti-calendar" /></button>
        </div>
      </div>
      <div className="scroll-area">
        <div className="summary-row analytics-summary-row">
          <div className="sum-card"><div className="sum-val" style={{ color: 'var(--green)' }}>{formatMoneyForCurrency(income, appCurrency, { decimals: 0 })}</div><div className="sum-lbl">Income</div></div>
          <div className="sum-card"><div className="sum-val" style={{ color: 'var(--red)' }}>{formatMoneyForCurrency(expenses, appCurrency, { decimals: 0 })}</div><div className="sum-lbl">Expenses</div></div>
          <div className="sum-card"><div className="sum-val" style={{ color: 'var(--accent)' }}>{formatMoneyForCurrency(savings, appCurrency, { decimals: 0 })}</div><div className="sum-lbl">Savings</div></div>
        </div>

        <div className="chart-card">
          <div className="chart-title">Monthly Overview</div>
          <div className="chart-bars">
            {monthlyTotals.map((month, index) => {
              const incomeHeight = month.income > 0 ? Math.max(8, Math.round((month.income / maxMonthTotal) * 100)) : 0;
              const expenseHeight = month.expense > 0 ? Math.max(8, Math.round((month.expense / maxMonthTotal) * 100)) : 0;
              const active = month.key === selectedMonth;
              return (
                <div className="bar-wrap dual-bar-wrap" key={month.key} style={{ '--bar-delay': `${index * 70}ms` }}>
                  <div className="dual-bars" aria-label={`${month.label} income and expense`}>
                    <div className="bar bar-animate income-bar" title="Income" style={{ height: `${incomeHeight}%`, opacity: active ? 1 : 0.45 }} />
                    <div className="bar bar-animate expense-bar" title="Expense" style={{ height: `${expenseHeight}%`, opacity: active ? 1 : 0.45 }} />
                  </div>
                  <div className="bar-lbl" style={{ color: active ? 'var(--accent)' : undefined, fontWeight: active ? 700 : undefined }}>{month.label}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-title chart-title-row">
            <span>Category Breakdown</span>
            <div className="category-mode-toggle" aria-label="Category chart type">
              <button type="button" className={categoryMode === 'expense' ? 'active' : ''} onClick={() => setCategoryMode('expense')}>Expense</button>
              <button type="button" className={categoryMode === 'income' ? 'active' : ''} onClick={() => setCategoryMode('income')}>Income</button>
            </div>
          </div>
          <div className="pie-row">
            <CategoryDonutChart categories={categories} total={categoryTotal} ledger={ledger} currency={appCurrency} type={categoryMode} />
            <div className="pie-legend">
              {categories.length ? categories.map(([name, amount]) => {
                const cat = categoryInfo(name, categoryMode, ledger.categories);
                return (
                  <div className="legend-item legend-item-animate" key={`${categoryMode}-${name}`}>
                    <div className="legend-dot" style={{ background: `var(--${cat.color})` }} />
                    <span className="legend-lbl">{name}</span>
                    <span className="legend-pct">{categoryTotal > 0 ? Math.round((amount / categoryTotal) * 100) : 0}%</span>
                  </div>
                );
              }) : <div className="empty-state">No {categoryMode} data for {monthLabel(selectedMonth)}.</div>}
            </div>
          </div>
        </div>

        <CategoryExpenseWatch watch={expenseWatch} ledger={ledger} currency={appCurrency} />

        <div className="chart-card">
          <div className="chart-title">Budget Progress</div>
          {selectedBudgets.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {selectedBudgets.map((budget) => {
                const spent = getConvertedBudgetSpent(analyticsTransactions, ledger.accounts, budget.category, selectedMonth, appCurrency, conversionRates);
                const limit = convertBudgetLimit(budget, appCurrency, conversionRates);
                const progress = limit > 0 ? Math.min(100, Math.round((spent / limit) * 100)) : 0;
                return (
                  <div key={budget.id} className="budget-animate-row">
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
                      <span style={{ color: 'var(--text2)' }}>{budget.name || budget.category}</span>
                      <span style={{ fontWeight: 700, color: progress >= 100 ? 'var(--red)' : 'var(--accent)' }}>{formatMoneyForCurrency(spent, appCurrency, { decimals: 0 })} / {formatMoneyForCurrency(limit, appCurrency, { decimals: 0 })}</span>
                    </div>
                    <div className="loan-progress"><div className="loan-bar" style={{ width: `${progress}%`, background: progress >= 100 ? 'var(--red)' : 'var(--accent)' }} /></div>
                  </div>
                );
              })}
            </div>
          ) : <div className="budget-empty-space" aria-hidden="true" />}
        </div>
      </div>

      <DateCalendarModal
        open={pickerOpen}
        title="Select Analytics Date"
        value={selectedDateValue}
        onSelect={setSelectedDateValue}
        close={() => setPickerOpen(false)}
      />
    </div>
  );
}
