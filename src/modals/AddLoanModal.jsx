import { useEffect, useState } from 'react';
import OptionPickerModal from './OptionPickerModal';
import { currencies } from '../models/currencies';
import DateCalendarModal, { formatCalendarDate, todayInputValue } from './DateCalendarModal';
import useKeyboardSheet from '../hooks/useKeyboardSheet';
import { DEFAULT_LOAN_REMINDER_TIME, formatLoanReminderTime, normalizeLoanReminderTime } from '../utils/loanReminder';
import TimePickerModal from './TimePickerModal';

export default function AddLoanModal({ open, close, onSave, onUpdate, editLoan = null, defaultCurrency = 'LKR', accounts = [] }) {
  const [person, setPerson] = useState('');
  const [type, setType] = useState('Lending');
  const [amount, setAmount] = useState('');
  const [paid, setPaid] = useState('');
  const [dueDateValue, setDueDateValue] = useState('');
  const [startDateValue, setStartDateValue] = useState(todayInputValue());
  const [reminderTime, setReminderTime] = useState(DEFAULT_LOAN_REMINDER_TIME);
  const [note, setNote] = useState('');
  const [currency, setCurrency] = useState(defaultCurrency || 'LKR');
  const [accountId, setAccountId] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [calendarMode, setCalendarMode] = useState(null);
  const [timePickerOpen, setTimePickerOpen] = useState(false);
  const { ref: sheetRef, keyboardOpen } = useKeyboardSheet(open);
  const isEditMode = !!editLoan?.id;

  useEffect(() => {
    if (!open) return;
    if (editLoan?.id) {
      setPerson(editLoan.person || '');
      setType(editLoan.type || 'Lending');
      setAmount(editLoan.amount ? String(editLoan.amount) : '');
      setPaid(editLoan.paid ? String(editLoan.paid) : '');
      setDueDateValue(editLoan.dueDateValue || '');
      setStartDateValue(editLoan.dateValue || todayInputValue());
      setReminderTime(normalizeLoanReminderTime(editLoan.reminderTime));
      setNote(editLoan.note || '');
      setAccountId(editLoan.accountId || accounts[0]?.id || '');
      setCurrency(editLoan.currency || accounts.find((account) => account.id === editLoan.accountId)?.currency || defaultCurrency || 'LKR');
      setTimePickerOpen(false);
      return;
    }
    setStartDateValue(todayInputValue());
    setReminderTime(DEFAULT_LOAN_REMINDER_TIME);
    const firstAccount = accounts[0];
    setAccountId(firstAccount?.id || '');
    setCurrency(firstAccount?.currency || defaultCurrency || 'LKR');
    setTimePickerOpen(false);
  }, [open, editLoan, defaultCurrency, accounts]);

  function reset() {
    setPerson('');
    setAmount('');
    setPaid('');
    setDueDateValue('');
    setStartDateValue(todayInputValue());
    setReminderTime(DEFAULT_LOAN_REMINDER_TIME);
    setNote('');
    setType('Lending');
    setAccountId(accounts[0]?.id || '');
    setCurrency(accounts[0]?.currency || defaultCurrency || 'LKR');
    setTimePickerOpen(false);
  }

  function submit() {
    const amountValue = Number(amount || 0);
    const paidValue = Number(paid || 0);
    if (!amountValue) return;
    const loanData = {
      person,
      type,
      amount: amountValue,
      paid: Math.min(amountValue, Math.max(0, paidValue)),
      dueDateValue: dueDateValue || '',
      due: dueDateValue ? formatCalendarDate(dueDateValue) : '',
      reminderTime: normalizeLoanReminderTime(reminderTime),
      dateValue: startDateValue || todayInputValue(),
      note,
      currency,
      accountId,
      createLinkedTransaction: !isEditMode
    };

    if (isEditMode) {
      onUpdate?.(editLoan.id, loanData);
      close();
      return;
    }

    onSave(loanData);
    reset();
    close();
  }

  function selectCalendar(value) {
    if (calendarMode === 'start') setStartDateValue(value);
    if (calendarMode === 'due') setDueDateValue(value);
  }

  return (
    <>
      <div className={`modal-overlay ${open ? 'open' : ''}`} onClick={close}>
        <div ref={sheetRef} className={`modal-sheet clean-form-sheet loan-form-sheet ${keyboardOpen ? 'keyboard-mode' : ''}`} onClick={(event) => event.stopPropagation()}>
          <div className="modal-handle" />
          <div className="modal-title">{isEditMode ? 'Edit Loan' : 'Add Loan'}</div>
          <div className="loan-type-choice">
            <button type="button" className={type === 'Lending' ? 'active lend' : ''} onClick={() => setType('Lending')}><i className="ti ti-arrow-up-right" /> I lent money</button>
            <button type="button" className={type === 'Borrowing' ? 'active borrow' : ''} onClick={() => setType('Borrowing')}><i className="ti ti-arrow-down-left" /> I borrowed</button>
          </div>
          <div className="form-stack">
            <label><span className="form-label">Person / Bank</span><input className="form-input loan-person-input" type="text" inputMode="text" autoComplete="off" enterKeyHint="next" value={person} onChange={(e) => setPerson(e.target.value)} placeholder="Name" /></label>
            <button type="button" className="form-picker-btn full-picker" onClick={() => setPickerOpen('account')}><span><i className="ti ti-wallet" />Loan account • {accounts.find((a) => a.id === accountId)?.name || 'No account'}</span><i className="ti ti-chevron-down" /></button>
            <button type="button" className="form-picker-btn full-picker" onClick={() => setPickerOpen('currency')}>
              <span><i className="ti ti-currency-dollar" />{currency}</span><i className="ti ti-chevron-down" />
            </button>
            <div className="field-row">
              <label><span className="form-label">Loan Amount</span><input className="form-input" type="number" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" /></label>
              <label><span className="form-label">{isEditMode ? 'Paid Amount' : 'Already Paid'}</span><input className="form-input" type="number" inputMode="decimal" value={paid} onChange={(e) => setPaid(e.target.value)} placeholder="0" /></label>
            </div>
            <button type="button" className="date-picker-row loan-date-row" onClick={() => setCalendarMode('start')}>
              <span className="date-picker-icon"><i className="ti ti-calendar-plus" /></span>
              <span className="date-picker-copy"><small>Start date</small><b>{formatCalendarDate(startDateValue)}</b></span>
              <i className="ti ti-chevron-right field-arrow" />
            </button>
            <button type="button" className="date-picker-row loan-date-row optional" onClick={() => setCalendarMode('due')}>
              <span className="date-picker-icon"><i className="ti ti-calendar-due" /></span>
              <span className="date-picker-copy"><small>Due date optional</small><b>{dueDateValue ? formatCalendarDate(dueDateValue) : 'No due date'}</b></span>
              {dueDateValue ? <span className="filter-clear" onClick={(e) => { e.stopPropagation(); setDueDateValue(''); }}><i className="ti ti-x" /></span> : <i className="ti ti-chevron-right field-arrow" />}
            </button>
            {dueDateValue && (
              <button type="button" className="loan-reminder-time-row loan-reminder-trigger" onClick={() => setTimePickerOpen(true)}>
                <span className="loan-reminder-icon"><i className="ti ti-bell-ringing" /></span>
                <span className="loan-reminder-copy"><small>Reminder notification time</small><b>{formatLoanReminderTime(reminderTime)}</b></span>
                <span className="loan-time-trigger">{formatLoanReminderTime(reminderTime)}</span>
              </button>
            )}
            <label><span className="form-label">Note</span><input className="form-input" type="text" inputMode="text" autoComplete="off" enterKeyHint="done" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional" /></label>
          </div>
          <div className="sheet-save-footer loan-form-footer">
            <button className="save-btn" onClick={submit}>{isEditMode ? 'Update Loan' : 'Save Loan'}</button>
          </div>
        </div>
      </div>

      <OptionPickerModal
        open={open && pickerOpen === 'type'}
        title="Loan Type"
        value={type}
        options={[{ value: 'Lending', label: 'I lent money', icon: 'ti-arrow-up-right' }, { value: 'Borrowing', label: 'I borrowed money', icon: 'ti-arrow-down-left' }]}
        onSelect={setType}
        close={() => setPickerOpen(false)}
      />
      <OptionPickerModal
        open={open && pickerOpen === 'account'}
        title="Loan Account"
        value={accountId}
        options={accounts.map((account) => ({ value: account.id, label: account.name, subtitle: `${account.currency || defaultCurrency} • ${account.hideFromTotal ? 'Hidden from total' : 'Visible total'}`, icon: account.icon || 'ti-wallet', color: account.color || 'accent' }))}
        onSelect={(value) => { setAccountId(value); const acc = accounts.find((a) => a.id === value); if (acc?.currency) setCurrency(acc.currency); }}
        close={() => setPickerOpen(false)}
      />
      <OptionPickerModal
        open={open && pickerOpen === 'currency'}
        title="Loan Currency"
        value={currency}
        options={currencies.map((item) => ({ value: item.code, label: `${item.code} — ${item.label}`, subtitle: `Example: ${item.symbol} 1,000`, icon: 'ti-currency-dollar', color: 'amber' }))}
        onSelect={setCurrency}
        close={() => setPickerOpen(false)}
      />
      <DateCalendarModal
        open={open && !!calendarMode}
        title={calendarMode === 'due' ? 'Select Due Date' : 'Select Start Date'}
        value={calendarMode === 'due' ? dueDateValue : startDateValue}
        onSelect={selectCalendar}
        close={() => setCalendarMode(null)}
      />
      <TimePickerModal
        open={open && timePickerOpen}
        title="Loan Reminder Time"
        value={reminderTime}
        onSelect={(value) => setReminderTime(normalizeLoanReminderTime(value))}
        close={() => setTimePickerOpen(false)}
      />
    </>
  );
}
