import { useMemo } from 'react';
import Header from '../components/Header';
import BalanceCard from '../components/BalanceCard';
import AccountPills from '../components/AccountPills';
import QuickActions from '../components/QuickActions';
import TransactionList from '../components/TransactionList';
import { buildHomeTotalsView } from '../utils/accountViewTotals';

export default function Home({ ledger, filter, setFilter, openAdd, openRecords, openAccount, openAccountDetails, openLoan, openBudget, openNotifications, openTransaction, openMore, conversionRates }) {
  const unread = ledger.state.notifications.filter((n) => !n.read).length;
  const homeTotals = useMemo(() => buildHomeTotalsView({
    totals: ledger.totals,
    accounts: ledger.accounts,
    transactions: ledger.state.transactions,
    filter,
    fallbackCurrency: ledger.state.currency || 'LKR',
    rates: conversionRates
  }), [ledger.totals, ledger.accounts, ledger.state.transactions, filter, ledger.state.currency, conversionRates]);

  return (
    <div className="screen active">
      <Header title="CashNest X" subtitle={ledger.state.userName ? `Welcome, ${ledger.state.userName}` : 'Welcome'} onNotifications={openNotifications} unread={unread} signedIn={ledger.state.signedIn} googleUser={ledger.state.googleUser} />
      <div className="scroll-area">
        <BalanceCard totals={homeTotals} currency={homeTotals.currency} appCurrency={ledger.state.currency} rates={conversionRates} label={homeTotals.label} />
        <AccountPills accounts={ledger.accounts} filter={filter} setFilter={setFilter} openAccount={openAccount} openAccountDetails={openAccountDetails} />
        <QuickActions openAdd={openAdd} openLoan={openLoan} openAccount={openAccount} openBudget={openBudget} openMore={openMore} notify={ledger.notify} />
        <TransactionList transactions={ledger.state.transactions} accounts={ledger.accounts} filter={filter} appCurrency={ledger.state.currency} conversionRates={conversionRates} onOpen={openTransaction} onSeeAll={() => openRecords?.('transactions')} />
      </div>
    </div>
  );
}
