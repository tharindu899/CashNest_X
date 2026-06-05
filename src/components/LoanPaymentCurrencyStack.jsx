import { formatMoneyForCurrency } from '../utils/currency';

export default function LoanPaymentCurrencyStack({
  payment,
  loanCurrency = 'LKR',
  appCurrency = 'LKR',
  tone,
  decimals = 0,
  className = ''
}) {
  const loanAmount = Number(payment?.amount || 0);
  const storedAccountAmount = Number(payment?.accountAmount ?? 0);
  const accountCurrency = payment?.accountCurrency || payment?.paymentCurrency || '';
  const hasOriginalCurrency = accountCurrency && accountCurrency !== loanCurrency && storedAccountAmount > 0;

  if (!hasOriginalCurrency) {
    const displayCurrency = payment?.currency || loanCurrency || appCurrency || 'LKR';
    return (
      <span className={`loan-payment-currency-stack ${className}`.trim()}>
        <b style={tone ? { color: tone } : undefined}>{formatMoneyForCurrency(loanAmount, displayCurrency, { decimals })}</b>
      </span>
    );
  }

  return (
    <span className={`loan-payment-currency-stack ${className}`.trim()}>
      <b style={tone ? { color: tone } : undefined}>{formatMoneyForCurrency(storedAccountAmount, accountCurrency, { decimals })}</b>
      <em>{formatMoneyForCurrency(loanAmount, loanCurrency || appCurrency || 'LKR', { decimals })}</em>
    </span>
  );
}
