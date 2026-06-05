export const DEFAULT_LOAN_REMINDER_TIME = '09:00';

export function normalizeLoanReminderTime(value) {
  const raw = String(value || '').trim();
  const match = raw.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return DEFAULT_LOAN_REMINDER_TIME;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return DEFAULT_LOAN_REMINDER_TIME;
  }
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function formatLoanReminderTime(value) {
  const normalized = normalizeLoanReminderTime(value);
  const [hours, minutes] = normalized.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  try {
    return date.toLocaleTimeString('en-LK', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return normalized;
  }
}

export function getLoanReminderDate(loan) {
  if (!loan?.dueDateValue) return null;
  const time = normalizeLoanReminderTime(loan.reminderTime);
  const date = new Date(`${loan.dueDateValue}T${time}:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}
