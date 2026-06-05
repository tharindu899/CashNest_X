import { categoryInfo } from '../models/categories';
import { convertCurrency, fallbackCurrencyRates } from './currencyConverter';
import { uid } from './format';
import { todayInputValue, formatCalendarDate } from '../modals/DateCalendarModal';

export function buildLoanPaymentTransaction({ loan, amount, account, dateValue, note, customCategories = [], paymentId = '', rates = fallbackCurrencyRates }) {
  const isLending = loan.type === 'Lending';
  const type = isLending ? 'income' : 'expense';
  const category = isLending ? 'Loan Payment Received' : 'Loan Repayment';
  const info = categoryInfo(category, type, customCategories);
  const loanCurrency = loan.currency || account?.currency || 'LKR';
  const accountCurrency = account?.currency || loanCurrency;
  const loanAmount = Number(amount || 0);
  const accountAmount = loanCurrency === accountCurrency ? loanAmount : convertCurrency(loanAmount, loanCurrency, accountCurrency, rates);
  return {
    id: uid(),
    type,
    amount: Number(accountAmount || 0),
    category,
    title: isLending ? `Payment from ${loan.person || 'Loan Person'}` : `Payment to ${loan.person || 'Loan Person'}`,
    accountId: account?.id || '',
    accountName: account?.name || 'Cash Wallet',
    fromAccountId: '',
    toAccountId: '',
    date: formatCalendarDate(dateValue || todayInputValue()),
    dateValue: dateValue || todayInputValue(),
    icon: 'ti-cash',
    color: isLending ? 'green' : 'red',
    loanId: loan.id || '',
    loanPaymentId: paymentId || '',
    loanKind: loan.type || '',
    loanPerson: loan.person || '',
    transactionNature: 'loan-payment',
    currency: accountCurrency,
    loanAmount,
    loanCurrency,
    accountAmount,
    accountCurrency,
    exchangeRates: rates,
    note: note || '',
    createdAt: Date.now()
  };
}
