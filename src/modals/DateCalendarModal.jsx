import { useEffect, useMemo, useState } from 'react';
import ModalPortal from '../components/ModalPortal';

const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function toDateInputValue(date = new Date()) {
  const d = new Date(date);
  d.setHours(12, 0, 0, 0);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function fromInputValue(value) {
  if (!value) return new Date();
  const [year, month, day] = String(value).split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

function sameDay(a, b) {
  return toDateInputValue(a) === toDateInputValue(b);
}

export function formatCalendarDate(value) {
  const d = fromInputValue(value || toDateInputValue(new Date()));
  return d.toLocaleDateString('en-LK', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function todayInputValue() {
  return toDateInputValue(new Date());
}

export default function DateCalendarModal({ open, title = 'Select Date', value, onSelect, close, mode = 'date' }) {
  const selectedDate = fromInputValue(value || todayInputValue());
  const [viewDate, setViewDate] = useState(() => new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));

  useEffect(() => {
    if (open) setViewDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
  }, [open, value]);

  const days = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const first = new Date(year, month, 1);
    const start = new Date(year, month, 1 - first.getDay());
    return Array.from({ length: 42 }, (_, index) => {
      const day = new Date(start);
      day.setDate(start.getDate() + index);
      day.setHours(12, 0, 0, 0);
      return day;
    });
  }, [viewDate]);

  if (!open) return null;

  function moveMonth(offset) {
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
  }

  function selectDate(day) {
    const next = toDateInputValue(day);
    onSelect?.(next);
    close?.();
  }

  function selectMonth() {
    const next = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, '0')}`;
    onSelect?.(next);
    close?.();
  }

  const modal = (
    <div className="choice-overlay calendar-overlay open" onClick={(event) => { event.stopPropagation(); close?.(); }}>
      <div className="choice-sheet calendar-sheet" onClick={(event) => event.stopPropagation()}>
        <div className="choice-handle" />
        <div className="calendar-top">
          <button type="button" className="calendar-nav" onClick={() => moveMonth(-1)}><i className="ti ti-chevron-left" /></button>
          <div>
            <div className="choice-title calendar-title">{title}</div>
            <div className="calendar-month-label">{monthNames[viewDate.getMonth()]} {viewDate.getFullYear()}</div>
          </div>
          <button type="button" className="calendar-nav" onClick={() => moveMonth(1)}><i className="ti ti-chevron-right" /></button>
        </div>

        <div className="calendar-quick-row">
          <button type="button" onClick={() => setViewDate(new Date())}><i className="ti ti-calendar-dot" /> Today</button>
          {mode === 'month' ? (
            <button type="button" onClick={selectMonth}><i className="ti ti-check" /> Use this month</button>
          ) : (
            <button type="button" onClick={() => selectDate(new Date())}><i className="ti ti-check" /> Pick today</button>
          )}
        </div>

        <div className="calendar-weekdays">
          {weekDays.map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}
        </div>
        <div className="calendar-grid">
          {days.map((day) => {
            const inMonth = day.getMonth() === viewDate.getMonth();
            const isSelected = mode === 'month' ? inMonth && day.getDate() === 1 && day.getFullYear() === selectedDate.getFullYear() && day.getMonth() === selectedDate.getMonth() : sameDay(day, selectedDate);
            const isToday = sameDay(day, new Date());
            return (
              <button
                key={day.toISOString()}
                type="button"
                className={`calendar-day ${!inMonth ? 'muted' : ''} ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}`}
                onClick={() => mode === 'month' ? selectMonth() : selectDate(day)}
              >
                <span>{day.getDate()}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  return <ModalPortal>{modal}</ModalPortal>;
}

