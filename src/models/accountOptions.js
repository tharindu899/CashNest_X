export const accountTypeIcons = {
  'Cash Wallet': 'ti-wallet',
  'Bank Account': 'ti-building-bank',
  'Savings Account': 'ti-pig-money',
  'Mobile Wallet': 'ti-device-mobile-dollar',
  'Foreign Cash': 'ti-world-dollar',
  'Card Account': 'ti-credit-card'
};

export function iconForAccountType(type) {
  return accountTypeIcons[type] || 'ti-wallet';
}
