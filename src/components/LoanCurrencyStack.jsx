import { formatMoneyForCurrency } from '../utils/currency';
import { convertCurrency } from '../utils/currencyConverter';

export default function LoanCurrencyStack({
  amount = 0,
  currency = 'LKR',
  appCurrency = 'LKR',
  rates,
  tone,
  decimals = 0,
  label,
  className = ''
}) {
  const sourceCurrency = currency || appCurrency || 'LKR';
  const targetCurrency = appCurrency || 'LKR';
  const showConverted = sourceCurrency !== targetCurrency;
  const sourceAmount = Number(amount || 0);
  const convertedAmount = convertCurrency(sourceAmount, sourceCurrency, targetCurrency, rates);

  return (
    <span className={`loan-currency-stack ${className}`.trim()} aria-label={label}>
      <b style={tone ? { color: tone } : undefined}>{formatMoneyForCurrency(sourceAmount, sourceCurrency, { decimals })}</b>
      {showConverted && (
        <em>{formatMoneyForCurrency(convertedAmount, targetCurrency, { decimals })}</em>
      )}
    </span>
  );
}
