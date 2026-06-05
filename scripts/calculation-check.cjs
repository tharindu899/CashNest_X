const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const root = process.cwd();
const runtime = path.join(root, '.calc-runtime');
fs.rmSync(runtime, { recursive: true, force: true });
fs.mkdirSync(path.join(runtime, 'src'), { recursive: true });
fs.writeFileSync(path.join(runtime, 'package.json'), '{"type":"module"}\n');

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.name.endsWith('.js')) out.push(full);
  }
  return out;
}

function rewriteImports(text) {
  return text.replace(/(from\s+['"])(\.\.?\/[^'"]+)(['"])/g, (_, prefix, spec, suffix) => {
    if (/\.(js|jsx|mjs|cjs|json)$/.test(spec)) return `${prefix}${spec}${suffix}`;
    return `${prefix}${spec}.js${suffix}`;
  }).replace(/(import\(['"])(\.\.?\/[^'"]+)(['"]\))/g, (_, prefix, spec, suffix) => {
    if (/\.(js|jsx|mjs|cjs|json)$/.test(spec)) return `${prefix}${spec}${suffix}`;
    return `${prefix}${spec}.js${suffix}`;
  });
}

for (const file of walk(path.join(root, 'src'))) {
  const rel = path.relative(path.join(root, 'src'), file);
  const target = path.join(runtime, 'src', rel);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, rewriteImports(fs.readFileSync(file, 'utf8')));
}

(async () => {
  try {
    const accountTotals = await import(pathToFileURL(path.join(runtime, 'src/utils/accountViewTotals.js')));
    const currentBalances = await import(pathToFileURL(path.join(runtime, 'src/utils/currentBalanceRates.js')));
    const analytics = await import(pathToFileURL(path.join(runtime, 'src/utils/analyticsCurrencyTotals.js')));
    const expenseWatch = await import(pathToFileURL(path.join(runtime, 'src/utils/categoryExpenseWatch.js')));
    const recordTransactions = await import(pathToFileURL(path.join(runtime, 'src/utils/recordTransactions.js')));

    const rates = { LKR: 1, USD: 300, EUR: 330 };
    const accounts = [
      { id: 'cash', name: 'Cash', currency: 'LKR', openingBalance: 1000, balance: 0, hideFromTotal: false },
      { id: 'usd', name: 'USD', currency: 'USD', openingBalance: 10, balance: 0, hideFromTotal: false },
      { id: 'hidden', name: 'Hidden', currency: 'LKR', openingBalance: 9999, balance: 9999, hideFromTotal: true }
    ];
    const txs = [
      { id: 'i1', type: 'income', amount: 1000, currency: 'LKR', accountId: 'cash', dateValue: '2026-06-03', exchangeRates: rates },
      { id: 'e1', type: 'expense', amount: 2, currency: 'USD', accountId: 'cash', dateValue: '2026-06-03', exchangeRates: rates },
      { id: 't1', type: 'transfer', amount: 300, currency: 'LKR', fromAccountId: 'cash', toAccountId: 'usd', toAmount: 1, toCurrency: 'USD', dateValue: '2026-06-03', exchangeRates: rates },
      { id: 'h1', type: 'income', amount: 5000, currency: 'LKR', accountId: 'hidden', dateValue: '2026-06-03', exchangeRates: rates }
    ];

    const cashBalance = 1000 + 1000 - 600 - 300;
    const usdBalance = 10 + 1;
    const accountsWithBalances = accounts.map((account) => account.id === 'cash' ? { ...account, balance: cashBalance } : account.id === 'usd' ? { ...account, balance: usdBalance } : account);

    const recordsWithOpening = recordTransactions.buildRecordTransactions(txs, accountsWithBalances);
    const visibleRecordOpening = recordsWithOpening.find((tx) => tx.id === 'record-opening-balance-cash');
    assert.equal(!!visibleRecordOpening, true, 'opening balance should be added as a record transaction');
    assert.equal(visibleRecordOpening.type, 'income', 'positive opening balance should count as income in records');
    assert.equal(accountTotals.sumTransactionsInCurrency(recordsWithOpening, accountsWithBalances, 'income', 'LKR', rates), 1000 + 5000 + 1000 + 3000 + 9999, 'record income total should include opening balances before visibility filter');

    assert.equal(accountTotals.getTransactionAmountInCurrency(txs[1], accountsWithBalances, 'LKR', rates), 600, 'USD expense should convert to LKR');
    assert.equal(accountTotals.getTransactionAmountInCurrency(txs[2], accountsWithBalances, 'USD', rates, 'usd'), 1, 'transfer receiver should use toAmount');
    assert.equal(currentBalances.buildCurrentBalanceTotal(accountsWithBalances, 'LKR', rates), cashBalance + usdBalance * 300, 'hidden account must not count in balance');

    const visibleRecords = recordsWithOpening.filter((tx) => !tx.accountId || tx.accountId !== 'hidden');
    assert.equal(accountTotals.sumTransactionsInCurrency(visibleRecords, accountsWithBalances, 'income', 'LKR', rates), 1000 + 1000 + 3000, 'visible record income total should include opening balance and exclude hidden opening balance');

    const allTotals = accountTotals.buildConvertedAllTotals(accountsWithBalances, txs, 'LKR', rates);
    assert.equal(allTotals.income, 1000, 'hidden income must not count in all totals');
    assert.equal(allTotals.expenses, 600, 'foreign-currency expense should count in main currency');
    assert.equal(allTotals.balance, 4400, 'current balance total should match account balances');

    const cashView = accountTotals.buildHomeTotalsView({ totals: {}, accounts: accountsWithBalances, transactions: txs, filter: 'cash', fallbackCurrency: 'LKR', rates });
    assert.equal(cashView.income, 1000, 'account income should use account currency');
    assert.equal(cashView.expenses, 600, 'account expense should convert to account currency');
    assert.equal(cashView.balance, cashBalance, 'account balance should match recalculated value');

    const loanAccounts = accountsWithBalances.map((account) => ({ ...account, openingBalance: 0, initialBalance: 0, balanceCorrectionDateValue: '' }));
    const loans = [{ id: 'loan1', type: 'Lending', person: 'Nimal', amount: 1000, paid: 200, currency: 'LKR', accountId: 'cash', dateValue: '2026-06-03', payments: [{ id: 'pay1', amount: 200, currency: 'LKR', accountId: 'cash', dateValue: '2026-06-03' }] }];
    const loanTxs = analytics.buildLoanAwareAnalyticsTransactions([], loans, loanAccounts);
    const juneTx = analytics.getMonthTransactions(loanTxs, loanAccounts, '2026-06');
    assert.equal(analytics.sumConvertedByType(juneTx, loanAccounts, 'expense', 'LKR', rates), 1000, 'Loan Given must count as expense');
    assert.equal(analytics.sumConvertedByType(juneTx, loanAccounts, 'income', 'LKR', rates), 200, 'Loan payment received must count as income');
    assert.equal(analytics.getConvertedBudgetSpent(loanTxs, loanAccounts, 'Loan Given', '2026-06', 'LKR', rates), 1000, 'Loan Given budget spending must count');

    const watchData = expenseWatch.buildCategoryExpenseWatch({
      transactions: [
        { id: 'food1', type: 'expense', category: 'Food', amount: 50, currency: 'LKR', accountId: 'cash', dateValue: '2026-06-04', exchangeRates: rates },
        { id: 'food2', type: 'expense', category: 'Food', amount: 50, currency: 'LKR', accountId: 'cash', dateValue: '2026-06-04', exchangeRates: rates },
        { id: 'food3', type: 'expense', category: 'Food', amount: 200, currency: 'LKR', accountId: 'cash', dateValue: '2026-06-01', exchangeRates: rates },
        { id: 'rent1', type: 'expense', category: 'Rent', amount: 500, currency: 'LKR', accountId: 'cash', dateValue: '2026-06-02', exchangeRates: rates },
        { id: 'oldfood', type: 'expense', category: 'Food', amount: 80, currency: 'LKR', accountId: 'cash', dateValue: '2026-05-04', exchangeRates: rates }
      ],
      accounts: loanAccounts,
      selectedMonth: '2026-06',
      selectedDate: '2026-06-04',
      targetCurrency: 'LKR',
      rates
    });
    const foodWatch = watchData.categories.find((item) => item.category === 'Food');
    assert.equal(foodWatch.dailyExpense, 100, 'Expense Watch daily expense should use the selected date total, not monthly average');
    assert.equal(foodWatch.amount, 300, 'Expense Watch this month expense should use the selected month category total');
    assert.equal(foodWatch.previous, 80, 'Expense Watch last month expense should use previous month category total');
    assert.equal(foodWatch.allTimeExpense, 380, 'Expense Watch all time expense should use every visible expense in the category');
    assert.equal(watchData.categories.findIndex((item) => item.category === 'Food') + 1, 2, 'Expense Watch rank should use this month category totals');

    console.log('✅ Calculation check passed: balances, currency conversion, hidden accounts, loans, payments, analytics totals, and expense watch date/all-time totals are correct.');
  } finally {
    fs.rmSync(runtime, { recursive: true, force: true });
  }
})().catch((error) => {
  fs.rmSync(runtime, { recursive: true, force: true });
  console.error(error);
  process.exit(1);
});
