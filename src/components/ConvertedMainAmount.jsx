import { buildMainCurrencyLine } from '../utils/transactionCurrencyView';

export default function ConvertedMainAmount({ transaction, accounts, appCurrency = 'LKR', rates, activeAccountId = 'All', className = '' }) {
  const line = buildMainCurrencyLine(transaction, accounts, appCurrency, rates, activeAccountId);
  if (!line) return null;
  return <div className={`tx-converted-amount ${className}`.trim()}>{line}</div>;
}
