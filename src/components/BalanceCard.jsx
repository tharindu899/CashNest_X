import { formatMoneyForCurrency } from '../utils/currency';
import { buildAccountMainCurrencyLine } from '../utils/accountMainCurrencyLine';

export default function BalanceCard({ totals, currency = 'LKR', appCurrency = 'LKR', rates, label = 'Total Balance' }) {
  const mainCurrencyLine = buildAccountMainCurrencyLine(totals.balance, currency, appCurrency, rates);
  return (
    <div className="balance-card">
      <div className="bal-label">{label}</div>
      <div className="bal-amount-wrap">
        <div className="bal-amount">{formatMoneyForCurrency(totals.balance, currency, { decimals: 2 })}</div>
        {mainCurrencyLine ? <div className="bal-converted-amount">{mainCurrencyLine}</div> : null}
      </div>
      <div className="bal-row">
        <div className="bal-stat">
          <div className="bal-stat-icon inc"><i className="ti ti-trending-up" /></div>
          <div className="bal-stat-info"><span className="bal-stat-lbl">Income</span><span className="bal-stat-val">{formatMoneyForCurrency(totals.income, currency, { decimals: 0 })}</span></div>
        </div>
        <div className="bal-stat">
          <div className="bal-stat-icon exp"><i className="ti ti-trending-down" /></div>
          <div className="bal-stat-info"><span className="bal-stat-lbl">Expenses</span><span className="bal-stat-val">{formatMoneyForCurrency(totals.expenses, currency, { decimals: 0 })}</span></div>
        </div>
      </div>
    </div>
  );
}
