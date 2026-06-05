import { useEffect, useMemo, useState } from 'react';
import ModalPortal from '../components/ModalPortal';
import DateCalendarModal, { formatCalendarDate, todayInputValue } from './DateCalendarModal';
import { formatRecordDateFilter, normalizeRecordDateRange, toMonthKey } from '../utils/dateRangeFilter';

const modes = [
  { value: 'all', label: 'All', icon: 'ti-infinity' },
  { value: 'day', label: 'Day', icon: 'ti-calendar-day' },
  { value: 'month', label: 'Month', icon: 'ti-calendar-month' },
  { value: 'range', label: 'Range', icon: 'ti-calendar-stats' }
];

function safeFilter(value) {
  return {
    mode: value?.mode || 'all',
    day: value?.day || todayInputValue(),
    month: value?.month || toMonthKey(new Date()),
    from: value?.from || todayInputValue(),
    to: value?.to || todayInputValue()
  };
}

export default function RecordDateFilterModal({ open, value, onApply, close }) {
  const [draft, setDraft] = useState(() => safeFilter(value));
  const [calendarTarget, setCalendarTarget] = useState(null);

  useEffect(() => {
    if (open) setDraft(safeFilter(value));
  }, [open, value]);

  const preview = useMemo(() => formatRecordDateFilter(normalizeRecordDateRange(draft), formatCalendarDate), [draft]);
  const monthPreview = useMemo(() => {
    const [year, month] = String(draft.month || toMonthKey(new Date())).split('-').map(Number);
    return new Date(year, (month || 1) - 1, 1, 12, 0, 0, 0).toLocaleDateString('en-LK', { month: 'long', year: 'numeric' });
  }, [draft.month]);

  if (!open) return null;

  function update(patch) {
    setDraft((current) => ({ ...current, ...patch }));
  }

  function apply(next = draft) {
    const clean = normalizeRecordDateRange(next);
    onApply?.(clean);
    close?.();
  }

  function openCalendar(field, mode = 'date') {
    setCalendarTarget({ field, mode });
  }

  function closeCalendar() {
    setCalendarTarget(null);
  }

  function selectCalendarValue(nextValue) {
    if (!calendarTarget?.field || !nextValue) return;
    update({ [calendarTarget.field]: nextValue });
  }

  function clearAll() {
    apply({ mode: 'all', day: todayInputValue(), month: toMonthKey(new Date()), from: todayInputValue(), to: todayInputValue() });
  }

  const modal = (
    <div className="choice-overlay open record-date-overlay" role="dialog" aria-modal="true" onClick={close}>
      <div className="choice-sheet record-date-sheet" onClick={(event) => event.stopPropagation()}>
        <div className="choice-handle" />
        <div className="choice-title">Record Date View</div>
        <div className="choice-subtitle">Watch records by day, month, or custom range.</div>

        <div className="record-date-mode-grid">
          {modes.map((item) => (
            <button key={item.value} type="button" className={draft.mode === item.value ? 'active' : ''} onClick={() => update({ mode: item.value })}>
              <i className={`ti ${item.icon}`} />
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        {draft.mode === 'day' && (
          <button className="record-date-input-row record-date-picker-row" type="button" onClick={() => openCalendar('day')}>
            <span><i className="ti ti-calendar-day" /> Select day</span>
            <b>{formatCalendarDate(draft.day)}</b>
            <i className="ti ti-chevron-right" />
          </button>
        )}

        {draft.mode === 'month' && (
          <button className="record-date-input-row record-date-picker-row" type="button" onClick={() => openCalendar('month', 'month')}>
            <span><i className="ti ti-calendar-month" /> Select month</span>
            <b>{monthPreview}</b>
            <i className="ti ti-chevron-right" />
          </button>
        )}

        {draft.mode === 'range' && (
          <div className="record-range-grid">
            <button className="record-date-input-row record-date-picker-row" type="button" onClick={() => openCalendar('from')}>
              <span><i className="ti ti-calendar-up" /> From</span>
              <b>{formatCalendarDate(draft.from)}</b>
              <i className="ti ti-chevron-right" />
            </button>
            <button className="record-date-input-row record-date-picker-row" type="button" onClick={() => openCalendar('to')}>
              <span><i className="ti ti-calendar-down" /> To</span>
              <b>{formatCalendarDate(draft.to)}</b>
              <i className="ti ti-chevron-right" />
            </button>
          </div>
        )}

        <div className="record-date-preview">
          <span>Showing</span>
          <b>{preview}</b>
        </div>

        <div className="record-date-actions">
          <button type="button" className="secondary" onClick={clearAll}>All dates</button>
          <button type="button" onClick={() => apply()}>Apply</button>
        </div>
      </div>

      <DateCalendarModal
        open={!!calendarTarget}
        title={calendarTarget?.mode === 'month' ? 'Select Month' : calendarTarget?.field === 'from' ? 'From Date' : calendarTarget?.field === 'to' ? 'To Date' : 'Select Day'}
        mode={calendarTarget?.mode || 'date'}
        value={calendarTarget?.mode === 'month' ? `${draft.month || toMonthKey(new Date())}-01` : draft[calendarTarget?.field] || todayInputValue()}
        onSelect={selectCalendarValue}
        close={closeCalendar}
      />
    </div>
  );

  return <ModalPortal>{modal}</ModalPortal>;
}
