export const currencies = [
  { code: 'LKR', label: 'Sri Lankan Rupee', symbol: 'Rs.', locale: 'en-LK' },
  { code: 'USD', label: 'US Dollar', symbol: '$', locale: 'en-US' },
  { code: 'EUR', label: 'Euro', symbol: '€', locale: 'en-IE' },
  { code: 'GBP', label: 'British Pound', symbol: '£', locale: 'en-GB' },
  { code: 'INR', label: 'Indian Rupee', symbol: '₹', locale: 'en-IN' },
  { code: 'AED', label: 'UAE Dirham', symbol: 'AED', locale: 'en-AE' },
  { code: 'AUD', label: 'Australian Dollar', symbol: 'A$', locale: 'en-AU' },
  { code: 'CAD', label: 'Canadian Dollar', symbol: 'C$', locale: 'en-CA' },
  { code: 'SGD', label: 'Singapore Dollar', symbol: 'S$', locale: 'en-SG' },
  { code: 'JPY', label: 'Japanese Yen', symbol: '¥', locale: 'ja-JP' },
  { code: 'CNY', label: 'Chinese Yuan', symbol: '¥', locale: 'zh-CN' },
  { code: 'SAR', label: 'Saudi Riyal', symbol: 'SAR', locale: 'en-SA' },
  { code: 'QAR', label: 'Qatari Riyal', symbol: 'QAR', locale: 'en-QA' },
  { code: 'KWD', label: 'Kuwaiti Dinar', symbol: 'KWD', locale: 'en-KW' },
  { code: 'MYR', label: 'Malaysian Ringgit', symbol: 'RM', locale: 'ms-MY' },
  { code: 'THB', label: 'Thai Baht', symbol: '฿', locale: 'th-TH' }
];

export const defaultCurrencyCode = 'LKR';

export function getCurrencyByCode(code) {
  return currencies.find((currency) => currency.code === code) || currencies[0];
}
