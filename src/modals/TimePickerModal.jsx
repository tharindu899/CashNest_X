import { useEffect, useState } from 'react';
import ModalPortal from '../components/ModalPortal';
import { DEFAULT_LOAN_REMINDER_TIME, formatLoanReminderTime, normalizeLoanReminderTime } from '../utils/loanReminder';

const PERIODS = ['AM', 'PM'];

function toParts(value) {
  const normalized = normalizeLoanReminderTime(value || DEFAULT_LOAN_REMINDER_TIME);
  const [rawHour, rawMinute] = normalized.split(':').map(Number);
  return {
    hour: rawHour % 12 || 12,
    minute: rawMinute,
    period: rawHour >= 12 ? 'PM' : 'AM'
  };
}

function toValue(hour, minute, period) {
  let nextHour = Number(hour || 12) % 12;
  if (period === 'PM') nextHour += 12;
  return `${String(nextHour).padStart(2, '0')}:${String(Number(minute || 0)).padStart(2, '0')}`;
}

function stepValue(current, offset, min, max, wrapTo) {
  const next = Number(current || min) + offset;
  if (next > max) return wrapTo?.high ?? min;
  if (next < min) return wrapTo?.low ?? max;
  return next;
}

export default function TimePickerModal({
  open,
  title = 'Reminder Time',
  value = DEFAULT_LOAN_REMINDER_TIME,
  onSelect,
  close
}) {
  const [hour, setHour] = useState(9);
  const [minute, setMinute] = useState(0);
  const [period, setPeriod] = useState('AM');

  useEffect(() => {
    if (!open) return;
    const parts = toParts(value);
    setHour(parts.hour);
    setMinute(parts.minute);
    setPeriod(parts.period);
  }, [open, value]);

  if (!open) return null;

  const selectedValue = toValue(hour, minute, period);

  function apply() {
    onSelect?.(selectedValue);
    close?.();
  }

  const modal = (
    <div className="choice-overlay calendar-overlay open" onClick={(event) => { event.stopPropagation(); close?.(); }}>
      <div className="choice-sheet type2-time-sheet no-keyboard-time-sheet" onClick={(event) => event.stopPropagation()}>
        <div className="choice-handle" />
        <div className="type2-time-head">
          <div>
            <div className="choice-title">{title}</div>
            <span>{formatLoanReminderTime(selectedValue)}</span>
          </div>
          <button type="button" onClick={close}><i className="ti ti-x" /></button>
        </div>

        <div className="type2-time-boxes no-keyboard-time-boxes">
          <div className="type2-time-box no-keyboard-time-box">
            <small>Hour</small>
            <button type="button" className="time-mini-step up" onClick={() => setHour((prev) => stepValue(prev, 1, 1, 12))}>
              <i className="ti ti-chevron-up" />
            </button>
            <strong>{String(hour).padStart(2, '0')}</strong>
            <button type="button" className="time-mini-step down" onClick={() => setHour((prev) => stepValue(prev, -1, 1, 12))}>
              <i className="ti ti-chevron-down" />
            </button>
          </div>

          <span className="type2-time-colon">:</span>

          <div className="type2-time-box no-keyboard-time-box">
            <small>Minute</small>
            <button type="button" className="time-mini-step up" onClick={() => setMinute((prev) => stepValue(prev, 5, 0, 59, { high: 0 }))}>
              <i className="ti ti-chevron-up" />
            </button>
            <strong>{String(minute).padStart(2, '0')}</strong>
            <button type="button" className="time-mini-step down" onClick={() => setMinute((prev) => stepValue(prev, -5, 0, 59, { low: 55 }))}>
              <i className="ti ti-chevron-down" />
            </button>
          </div>

          <div className="type2-period-box small-period-box" aria-label="AM PM selector">
            {PERIODS.map((item) => (
              <button
                key={item}
                type="button"
                className={period === item ? 'active' : ''}
                onClick={() => setPeriod(item)}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className="type2-time-actions">
          <button type="button" className="ghost" onClick={close}>Cancel</button>
          <button type="button" className="apply" onClick={apply}>Set</button>
        </div>
      </div>
    </div>
  );

  return <ModalPortal>{modal}</ModalPortal>;
}
