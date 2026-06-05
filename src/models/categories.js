export const categories = [
  { name: 'Food', icon: 'ti-tools-kitchen-2', color: 'red' },
  { name: 'Groceries', icon: 'ti-shopping-cart', color: 'green' },
  { name: 'Transport', icon: 'ti-car', color: 'accent' },
  { name: 'Fuel', icon: 'ti-gas-station', color: 'amber' },
  { name: 'Shopping', icon: 'ti-shopping-bag', color: 'amber' },
  { name: 'Bills', icon: 'ti-file-invoice', color: 'purple' },
  { name: 'Utilities', icon: 'ti-bolt', color: 'purple' },
  { name: 'Rent', icon: 'ti-home-dollar', color: 'accent' },
  { name: 'Health', icon: 'ti-heartbeat', color: 'green' },
  { name: 'Education', icon: 'ti-school', color: 'teal' },
  { name: 'Entertainment', icon: 'ti-device-tv', color: 'pink' },
  { name: 'Travel', icon: 'ti-plane', color: 'teal' },
  { name: 'Smoke', icon: 'ti-smoking', color: 'purple' },
  { name: 'Drink', icon: 'ti-beer', color: 'amber' },
  { name: 'Family', icon: 'ti-users', color: 'pink' },
  { name: 'Gift', icon: 'ti-gift', color: 'amber' },
  { name: 'Loan Given', icon: 'ti-clock-dollar', color: 'amber' },
  { name: 'Loan Received', icon: 'ti-clock-dollar', color: 'green' },
  { name: 'Loan Repayment', icon: 'ti-cash', color: 'red' },
  { name: 'Loan Payment Received', icon: 'ti-cash', color: 'green' },
  { name: 'Balance Correction', icon: 'ti-adjustments-dollar', color: 'accent' },
  { name: 'Other', icon: 'ti-dots', color: 'accent' }
];

export const categoryIconChoices = [
  'ti-tools-kitchen-2','ti-shopping-cart','ti-car','ti-bus','ti-motorbike','ti-gas-station','ti-shopping-bag','ti-shirt','ti-file-invoice','ti-bolt','ti-wifi','ti-phone','ti-home-dollar','ti-building-bank','ti-wallet','ti-device-mobile-dollar','ti-heartbeat','ti-pill','ti-school','ti-book','ti-device-tv','ti-music','ti-ball-football','ti-smoking','ti-beer','ti-glass-cocktail','ti-bottle','ti-plane','ti-map-pin','ti-users','ti-baby-carriage','ti-gift','ti-target','ti-pig-money','ti-clock-dollar','ti-adjustments-dollar','ti-dots'
];

export const categoryColorChoices = ['red', 'green', 'accent', 'amber', 'purple', 'pink', 'teal'];

export function colorVar(color) {
  const map = { green:'var(--green)', red:'var(--red)', amber:'var(--amber)', purple:'var(--purple)', pink:'var(--pink)', teal:'var(--teal)', accent:'var(--accent)' };
  return map[color] || 'var(--accent)';
}

export function allCategories(customCategories = []) {
  const map = new Map();
  [...categories, ...(customCategories || [])].forEach((item) => {
    if (item?.name) map.set(item.name, item);
  });
  return Array.from(map.values());
}

export function categoryInfo(category, type, customCategories = []) {
  if (type === 'income') return { name: 'Income', icon: 'ti-briefcase', color: 'green' };
  if (type === 'transfer') return { name: 'Transfer', icon: 'ti-arrows-exchange', color: 'accent' };
  return allCategories(customCategories).find((item) => item.name === category) || allCategories(customCategories).find((item) => item.name === 'Other') || categories[categories.length - 1];
}
