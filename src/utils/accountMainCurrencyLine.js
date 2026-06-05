import { convertCurrentBalance } from './currentBalanceRates';
import { formatMoneyForCurrency } from './currency';

export function shouldShowAccountMainCurrencyLine(viewCurrency = 'LKR', appCurrency = 'LKR') {
  return !!viewCurrency && !!appCurrency && viewCurrency !== appCurrency;
}

export function buildAccountMainCurrencyLine(amount = 0, viewCurrency = 'LKR', appCurrency = 'LKR', rates) {
  if (!shouldShowAccountMainCurrencyLine(viewCurrency, appCurrency)) return '';
  const convertedAmount = convertCurrentBalance(Number(amount || 0), viewCurrency, appCurrency, rates);
  return formatMoneyForCurrency(convertedAmount, appCurrency, { decimals: 0 });
}
