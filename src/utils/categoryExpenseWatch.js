import {
  getAnalyticsDate,
  getAnalyticsMonthKey,
  getConvertedTransactionAmount,
  getVisibleAnalyticsTransactions
} from './analyticsCurrencyTotals';

function getPreviousMonthKey(monthKey = '') {
  const [year, month] = String(monthKey).split('-').map(Number);
  if (!year || !month) return getAnalyticsMonthKey(new Date());
  return getAnalyticsMonthKey(new Date(year, month - 2, 1));
}

function getAnalyticsDateKey(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 10);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function getTransactionDateKey(tx = {}) {
  if (tx?.dateValue && /^\d{4}-\d{2}-\d{2}$/.test(String(tx.dateValue))) return tx.dateValue;
  return getAnalyticsDateKey(getAnalyticsDate(tx));
}

function categoryTotalsForMonth(transactions = [], accounts = [], selectedMonth = '', targetCurrency = 'LKR', rates) {
  return getVisibleAnalyticsTransactions(transactions, accounts)
    .filter((tx) => tx?.type === 'expense' && getAnalyticsMonthKey(getAnalyticsDate(tx)) === selectedMonth)
    .reduce((totals, tx) => {
      const category = tx.category || 'Other';
      const amount = getConvertedTransactionAmount(tx, accounts, targetCurrency, rates);
      return { ...totals, [category]: (totals[category] || 0) + amount };
    }, {});
}

function categoryTotalsForDay(transactions = [], accounts = [], selectedDate = '', targetCurrency = 'LKR', rates) {
  const selectedDateKey = selectedDate ? getAnalyticsDateKey(`${selectedDate}T00:00:00`) : getAnalyticsDateKey(new Date());
  return getVisibleAnalyticsTransactions(transactions, accounts)
    .filter((tx) => tx?.type === 'expense' && getTransactionDateKey(tx) === selectedDateKey)
    .reduce((totals, tx) => {
      const category = tx.category || 'Other';
      const amount = getConvertedTransactionAmount(tx, accounts, targetCurrency, rates);
      return { ...totals, [category]: (totals[category] || 0) + amount };
    }, {});
}

function categoryTotalsForAllTime(transactions = [], accounts = [], targetCurrency = 'LKR', rates) {
  return getVisibleAnalyticsTransactions(transactions, accounts)
    .filter((tx) => tx?.type === 'expense')
    .reduce((totals, tx) => {
      const category = tx.category || 'Other';
      const amount = getConvertedTransactionAmount(tx, accounts, targetCurrency, rates);
      return { ...totals, [category]: (totals[category] || 0) + amount };
    }, {});
}

function getSpendStatus({ amount = 0, total = 0, previous = 0 }) {
  const share = total > 0 ? amount / total : 0;
  const change = previous > 0 ? (amount - previous) / previous : null;

  if (share >= 0.45 || (change !== null && change >= 0.5)) return 'danger';
  if (share >= 0.3 || (change !== null && change >= 0.25)) return 'watch';
  return 'safe';
}

function getReason(item = {}) {
  if (item.previous <= 0) return 'New spend this month';
  if (item.changePercent >= 25) return 'Higher than last month';
  if (item.changePercent <= -20) return 'Lower than last month';
  if (item.percentage >= 30) return 'Main expense area';
  return 'Normal spending';
}

export function buildCategoryExpenseWatch({
  transactions = [],
  accounts = [],
  selectedMonth = '',
  selectedDate = '',
  targetCurrency = 'LKR',
  rates
} = {}) {
  const monthKey = selectedMonth || getAnalyticsMonthKey(new Date());
  const previousMonthKey = getPreviousMonthKey(monthKey);
  const selectedDateKey = selectedDate ? getAnalyticsDateKey(`${selectedDate}T00:00:00`) : getAnalyticsDateKey(new Date());
  const currentTotals = categoryTotalsForMonth(transactions, accounts, monthKey, targetCurrency, rates);
  const dayTotals = categoryTotalsForDay(transactions, accounts, selectedDateKey, targetCurrency, rates);
  const previousTotals = categoryTotalsForMonth(transactions, accounts, previousMonthKey, targetCurrency, rates);
  const allTimeTotals = categoryTotalsForAllTime(transactions, accounts, targetCurrency, rates);
  const total = Object.values(currentTotals).reduce((sum, amount) => sum + amount, 0);

  const categories = Object.entries(currentTotals)
    .filter(([, amount]) => amount > 0)
    .map(([category, amount]) => {
      const previous = previousTotals[category] || 0;
      const dailyExpense = dayTotals[category] || 0;
      const allTimeExpense = allTimeTotals[category] || 0;
      const percentage = total > 0 ? Math.round((amount / total) * 100) : 0;
      const changePercent = previous > 0 ? Math.round(((amount - previous) / previous) * 100) : null;
      const status = getSpendStatus({ amount, total, previous });
      const item = {
        category,
        amount,
        previous,
        dailyExpense,
        allTimeExpense,
        percentage,
        changePercent,
        status
      };
      return { ...item, reason: getReason(item) };
    })
    .sort((a, b) => b.amount - a.amount);

  const highSpendCount = categories.filter((item) => item.status === 'danger').length;
  const watchCount = categories.filter((item) => item.status === 'watch').length;
  const topCategory = categories[0] || null;
  const status = highSpendCount ? 'danger' : watchCount ? 'watch' : categories.length ? 'safe' : 'empty';

  return {
    monthKey,
    previousMonthKey,
    total,
    selectedDateKey,
    status,
    highSpendCount,
    watchCount,
    topCategory,
    categories
  };
}
