export function toDateKey(date = new Date()) {
  const next = new Date(date);
  next.setHours(12, 0, 0, 0);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`;
}

export function toMonthKey(date = new Date()) {
  const next = new Date(date);
  next.setHours(12, 0, 0, 0);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`;
}

export function isDateInRecordRange(dateValue, filter = {}) {
  if (!dateValue || !filter || filter.mode === 'all') return !filter || filter.mode === 'all';
  const mode = filter.mode || 'all';
  if (mode === 'day') return dateValue === filter.day;
  if (mode === 'month') return String(dateValue).slice(0, 7) === filter.month;
  if (mode === 'range') {
    const from = filter.from || '';
    const to = filter.to || '';
    if (from && dateValue < from) return false;
    if (to && dateValue > to) return false;
    return true;
  }
  return true;
}

export function formatRecordDateFilter(filter = {}, formatDate) {
  const mode = filter.mode || 'all';
  if (mode === 'day' && filter.day) return formatDate ? formatDate(filter.day) : filter.day;
  if (mode === 'month' && filter.month) {
    const [year, month] = String(filter.month).split('-').map(Number);
    return new Date(year, month - 1, 1).toLocaleDateString('en-LK', { month: 'short', year: 'numeric' });
  }
  if (mode === 'range') {
    const from = filter.from ? (formatDate ? formatDate(filter.from) : filter.from) : 'Start';
    const to = filter.to ? (formatDate ? formatDate(filter.to) : filter.to) : 'Today';
    return `${from} - ${to}`;
  }
  return 'All Dates';
}

export function normalizeRecordDateRange(filter = {}) {
  if ((filter.mode || 'all') !== 'range') return filter;
  const from = filter.from || '';
  const to = filter.to || '';
  if (from && to && from > to) return { ...filter, from: to, to: from };
  return filter;
}
