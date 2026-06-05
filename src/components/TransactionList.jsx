import { colorVar } from '../models/categories';
import { formatMoneyForCurrency } from '../utils/currency';
import ConvertedMainAmount from './ConvertedMainAmount';
import { getTransactionCurrency } from '../utils/accountViewTotals';
import { visibleTransactionsForAccountFilter } from '../utils/transactionFilters';
import { formatCalendarDate, todayInputValue } from '../modals/DateCalendarModal';
import { getTransferDisplayAmount } from '../utils/transferCurrency';

export default function TransactionList({ transactions, accounts, filter, appCurrency = 'LKR', conversionRates, onOpen, onSeeAll }) {
  const filtered = visibleTransactionsForAccountFilter(transactions, accounts, filter);
  if (!filtered.length) return <div className="empty-state">All zero. Add your first transaction.</div>;

  const groups = filtered.reduce((map, tx) => {
    const key = tx.dateValue || todayInputValue();
    if (!map[key]) map[key] = [];
    map[key].push(tx);
    return map;
  }, {});
  const sortedKeys = Object.keys(groups).sort((a, b) => (a < b ? 1 : -1));

  return (
    <>
      {sortedKeys.map((dateKey) => (
        <div key={dateKey}>
          <div className="date-group"><span>{dateKey === todayInputValue() ? 'Today' : formatCalendarDate(dateKey)}</span><button type="button" className="see-all-btn" onClick={onSeeAll}>See All</button></div>
          {groups[dateKey].map((tx) => {
            const sign = tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : '';
            const cls = tx.type === 'income' ? 'inc' : tx.type === 'expense' ? 'exp' : '';
            const from = accounts.find((a) => a.id === tx.fromAccountId)?.name;
            const to = accounts.find((a) => a.id === tx.toAccountId)?.name;
            const currencyCode = getTransactionCurrency(tx, accounts, appCurrency, filter);
            const meta = tx.type === 'transfer' ? `${from || 'From'} → ${to || 'To'}` : `${tx.category} • ${tx.accountName}`;
            return (
              <div className="tx-card" key={tx.id} onClick={() => onOpen(tx)} title="Open transaction details">
                <div className="tx-icon" style={{ background: 'rgba(79,142,247,0.12)', color: colorVar(tx.color) }}><i className={`ti ${tx.icon}`} /></div>
                <div className="tx-info"><div className="tx-name">{tx.title}</div><div className="tx-meta">{meta}</div></div>
                <div className="tx-amount-wrap">
                  <div className={`tx-amount ${cls}`} style={tx.type === 'transfer' ? { color: 'var(--accent)' } : undefined}>{sign}{formatMoneyForCurrency(getTransferDisplayAmount(tx, accounts, filter), currencyCode, { decimals: 0 })}</div>
                  <ConvertedMainAmount transaction={tx} accounts={accounts} appCurrency={appCurrency} rates={conversionRates} activeAccountId={filter} />
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </>
  );
}
