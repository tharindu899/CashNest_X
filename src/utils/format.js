import { money } from './currency';

export const fmt = (n) => money(n, { decimals: 0 });
export const fmtFull = (n) => money(n, { decimals: 2 });
export const fmtShort = (n) => money(n, { decimals: 0, short: true });
export const uid = () => 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
