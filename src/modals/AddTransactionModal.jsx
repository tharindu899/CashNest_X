import { useEffect, useMemo, useRef, useState } from 'react';
import ModalPortal from '../components/ModalPortal';
import useKeyboardSheet from '../hooks/useKeyboardSheet';
import { getCurrencyByCode } from '../models/currencies';
import OptionPickerModal from './OptionPickerModal';
import DateCalendarModal, { formatCalendarDate, todayInputValue } from './DateCalendarModal';
import { getTransferAmounts } from '../utils/transferCurrency';
import { formatMoneyForCurrency } from '../utils/currency';
import { DEFAULT_LOAN_REMINDER_TIME, formatLoanReminderTime, normalizeLoanReminderTime } from '../utils/loanReminder';
import TimePickerModal from './TimePickerModal';

const incomeCategories = [
  { name: 'Income', icon: 'ti-briefcase', color: 'green' },
  { name: 'Salary', icon: 'ti-wallet', color: 'green' },
  { name: 'Bonus', icon: 'ti-gift', color: 'accent' },
  { name: 'Other', icon: 'ti-dots', color: 'teal' }
];

export default function AddTransactionModal({ open, close, accounts, categories = [], currency = 'LKR', defaultType = 'expense', preset = null, editTransaction = null, onSave, onUpdate, onLoanSave, onCreateCategory, conversionRates }) {
  const [type, setType] = useState(defaultType);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Food');
  const [accountId, setAccountId] = useState('');
  const [fromAccountId, setFromAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [note, setNote] = useState('');
  const [receiptImage, setReceiptImage] = useState('');
  const [receiptName, setReceiptName] = useState('');
  const [dateValue, setDateValue] = useState(todayInputValue());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [picker, setPicker] = useState(null);
  const [loanPerson, setLoanPerson] = useState('');
  const [loanKind, setLoanKind] = useState('Lending');
  const [loanDueDateValue, setLoanDueDateValue] = useState('');
  const [loanReminderTime, setLoanReminderTime] = useState(DEFAULT_LOAN_REMINDER_TIME);
  const [loanCalendarOpen, setLoanCalendarOpen] = useState(false);
  const [loanReminderOpen, setLoanReminderOpen] = useState(false);
  const { ref: sheetRef, keyboardOpen } = useKeyboardSheet(open);
  const receiptInputRef = useRef(null);
  const isEditMode = !!editTransaction;

  function cleanAmountInput(value) {
    const normalized = String(value || '').replace(/,/g, '.').replace(/[^0-9.]/g, '');
    const parts = normalized.split('.');
    if (parts.length <= 1) return parts[0];
    return `${parts[0]}.${parts.slice(1).join('').slice(0, 2)}`;
  }

  function amountValue() {
    const value = Number(String(amount || '').replace(/,/g, '.'));
    return Number.isFinite(value) ? value : 0;
  }

  function handleAmountChange(event) {
    setAmount(cleanAmountInput(event.target.value));
  }

  function attachReceiptFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setReceiptImage(String(reader.result || ''));
      setReceiptName(file.name || 'receipt.jpg');
    };
    reader.readAsDataURL(file);
  }

  const defaultExpenseCategory = categories[0]?.name || 'Other';
  const firstAccountId = accounts[0]?.id || '';
  const secondAccountId = accounts[1]?.id || '';
  const selectedAccount = accounts.find((account) => account.id === accountId) || accounts[0];
  const fromAccount = accounts.find((account) => account.id === fromAccountId) || accounts[0];
  const toAccount = accounts.find((account) => account.id === toAccountId) || accounts[1] || accounts[0];
  const activeMoneyAccount = type === 'transfer' ? fromAccount : selectedAccount;
  const currencyInfo = getCurrencyByCode(activeMoneyAccount?.currency || currency);
  const transferPreview = type === 'transfer' ? getTransferAmounts({ amount: amountValue(), fromAccount, toAccount, rates: conversionRates }) : null;
  const sameTransferAccount = type === 'transfer' && !!fromAccountId && !!toAccountId && fromAccountId === toAccountId;
  const canSaveTransaction = amountValue() > 0 && (type !== 'transfer' || (!!fromAccountId && !!toAccountId && !sameTransferAccount));

  useEffect(() => {
    if (!open) return;
    const source = editTransaction || preset || null;
    const nextType = editTransaction?.type || defaultType;
    setType(nextType);
    setAmount(source?.amount ? String(source.amount) : '');
    setNote(source?.note || source?.title || '');
    setReceiptImage(source?.receiptImage || '');
    setReceiptName(source?.receiptName || '');
    setDateValue(source?.dateValue || todayInputValue());
    setCategory(source?.category || (nextType === 'income' ? 'Income' : nextType === 'transfer' ? 'Transfer' : defaultExpenseCategory));
    setAccountId(source?.accountId || firstAccountId);
    setFromAccountId(source?.fromAccountId || firstAccountId);
    setToAccountId(source?.toAccountId || secondAccountId);
    setLoanPerson('');
    setLoanKind('Lending');
    setLoanDueDateValue('');
    setLoanReminderTime(DEFAULT_LOAN_REMINDER_TIME);
    setLoanCalendarOpen(false);
    setLoanReminderOpen(false);
    setPicker(null);
    requestAnimationFrame(() => { if (sheetRef.current) sheetRef.current.scrollTop = 0; });
  }, [open, defaultType, firstAccountId, secondAccountId, preset, editTransaction, defaultExpenseCategory]);


  useEffect(() => {
    if (!open || type !== 'transfer' || accounts.length < 2) return;
    if (!fromAccountId) setFromAccountId(accounts[0]?.id || '');
    if (!toAccountId) setToAccountId(accounts[1]?.id || accounts[0]?.id || '');
    if (fromAccountId && toAccountId && fromAccountId === toAccountId) {
      const alternate = accounts.find((account) => account.id !== fromAccountId)?.id || '';
      if (alternate) setToAccountId(alternate);
    }
  }, [open, type, accounts, fromAccountId, toAccountId]);

  const visibleCategories = useMemo(() => (type === 'income' ? incomeCategories : categories), [type, categories]);

  function changeType(nextType) {
    if (isEditMode && nextType === 'loan') return;
    setType(nextType);
    if (nextType === 'income') setCategory('Income');
    if (nextType === 'expense') setCategory(defaultExpenseCategory);
    if (nextType === 'loan') setCategory('Loan');
  }

  function pickerOptions() {
    if (picker === 'category') return [...visibleCategories.map((item) => ({ value: item.name, label: item.name, icon: item.icon, color: item.color })), { value: '__create__', label: 'Create New Category', icon: 'ti-plus', color: 'accent', subtitle: 'Add your own icon and name' }];
    if (picker === 'account') return accounts.length ? accounts.map((account) => ({ value: account.id, label: account.name, icon: account.icon || 'ti-wallet', subtitle: `${account.currency || currency} account` })) : [{ value: '', label: 'Cash Wallet', icon: 'ti-wallet', subtitle: currency }];
    if (picker === 'from') return accounts.map((account) => ({ value: account.id, label: account.name, icon: account.icon || 'ti-wallet', subtitle: `${account.currency || currency} account` }));
    if (picker === 'to') return accounts.map((account) => ({ value: account.id, label: account.name, icon: account.icon || 'ti-wallet', subtitle: `${account.currency || currency} account` }));
    if (picker === 'loanKind') return [
      { value: 'Lending', label: 'I lent money', icon: 'ti-arrow-up-right' },
      { value: 'Borrowing', label: 'I borrowed money', icon: 'ti-arrow-down-left' }
    ];
    return [];
  }

  function pickerValue() {
    if (picker === 'category') return category;
    if (picker === 'account') return accountId;
    if (picker === 'from') return fromAccountId;
    if (picker === 'to') return toAccountId;
    if (picker === 'loanKind') return loanKind;
    return '';
  }

  function selectPicker(value) {
    if (picker === 'category') { if (value === '__create__') { setPicker(null); onCreateCategory?.(); } else setCategory(value); }
    if (picker === 'account') setAccountId(value);
    if (picker === 'from') setFromAccountId(value);
    if (picker === 'to') setToAccountId(value);
    if (picker === 'loanKind') setLoanKind(value);
  }

  function submit() {
    const value = amountValue();
    if (!value || value <= 0) return;

    if (type === 'transfer') {
      if (!fromAccountId || !toAccountId || fromAccountId === toAccountId) return;
      const transfer = getTransferAmounts({ amount: value, fromAccount, toAccount, rates: conversionRates });
      const payload = { type, amount: value, toAmount: transfer.targetAmount, category: 'Transfer', fromAccountId, toAccountId, note, dateValue, rates: conversionRates, currency: transfer.fromCurrency, toCurrency: transfer.toCurrency };
      if (isEditMode) onUpdate?.(editTransaction.id, payload); else onSave(payload);
      close();
      return;
    }

    if (type === 'loan' && !isEditMode) {
      const person = loanPerson.trim() || 'Loan Person';
      const savedLoan = onLoanSave?.({ person, type: loanKind, amount: value, paid: 0, dueDateValue: loanDueDateValue || '', due: loanDueDateValue ? formatCalendarDate(loanDueDateValue) : '', reminderTime: normalizeLoanReminderTime(loanReminderTime), note, dateValue, currency: activeMoneyAccount?.currency || currency, accountId: accountId || firstAccountId, createLinkedTransaction: false });
      const txType = loanKind === 'Lending' ? 'expense' : 'income';
      onSave({
        type: txType,
        amount: value,
        category: loanKind === 'Lending' ? 'Loan Given' : 'Loan Received',
        accountId: accountId || firstAccountId,
        note: note || `${loanKind} - ${person}`,
        forceTitle: loanKind === 'Lending' ? `Loan to ${person}` : `Loan from ${person}`,
        forceIcon: 'ti-clock-dollar',
        forceColor: loanKind === 'Lending' ? 'amber' : 'green',
        loanId: savedLoan?.id || '',
        loanKind,
        loanPerson: person,
        transactionNature: 'loan',
        currency: activeMoneyAccount?.currency || currency,
        dateValue,
        rates: conversionRates
      });
      close();
      return;
    }

    const payload = { type, amount: value, category, accountId: accountId || firstAccountId, note, forceTitle: isEditMode ? undefined : preset?.title, dateValue, receiptImage, receiptName, rates: conversionRates, currency: activeMoneyAccount?.currency || currency };
    if (isEditMode) onUpdate?.(editTransaction.id, payload); else onSave(payload);
    close();
  }

  const pickerTitle = {
    category: 'Choose Category',
    account: 'Choose Account',
    from: 'From Account',
    to: 'To Account',
    loanKind: 'Loan Type'
  }[picker] || '';

  function handleEnterSubmit(event) {
    if (event.key !== 'Enter' || event.isComposing || picker || calendarOpen || loanCalendarOpen || loanReminderOpen) return;
    const tagName = event.target?.tagName?.toLowerCase();
    if (tagName === 'button') return;
    event.preventDefault();
    submit();
  }

  if (!open) return null;

  const modal = (
      <div className={`modal-overlay add-transaction-overlay ${open ? 'open' : ''}`} onClick={close}>
        <div className={`modal-sheet add-tx-sheet ${keyboardOpen ? 'keyboard-mode' : ''}`} ref={sheetRef} onClick={(event) => event.stopPropagation()} onKeyDown={handleEnterSubmit}>
          <div className="add-tx-scroll sheet-scroll-content">
          <div className="modal-handle" />
          <div className="modal-title">{isEditMode ? 'Edit Transaction' : 'Add Transaction'}</div>

          <div className="type-tabs type-tabs-four">
            <button type="button" className={`type-tab ${type === 'expense' ? 'sel-exp' : ''}`} onClick={() => changeType('expense')}>Expense</button>
            <button type="button" className={`type-tab ${type === 'income' ? 'sel-inc' : ''}`} onClick={() => changeType('income')}>Income</button>
            <button type="button" className={`type-tab ${type === 'transfer' ? 'sel-xfer' : ''}`} onClick={() => changeType('transfer')}>Transfer</button>
            {!isEditMode && <button type="button" className={`type-tab ${type === 'loan' ? 'sel-loan' : ''}`} onClick={() => changeType('loan')}>Loan</button>}
          </div>

          <div className="amt-input-wrap safe-amount-wrap">
            <span className="amt-prefix">{currencyInfo.symbol}</span>
            <input className="amt-input safe-amount-input" type="text" inputMode="decimal" pattern="[0-9]*[.]?[0-9]{0,2}" placeholder="0.00" value={amount} onChange={handleAmountChange} autoFocus={open} />
          </div>

          {type === 'loan' ? (
            <>
              <div className="field-row add-tx-field-row">
                <button type="button" className="field add-tx-field" onClick={() => setPicker('loanKind')}>
                  <i className="ti ti-clock-dollar" />
                  <div><span className="field-lbl">Loan Type</span><span className="field-val">{loanKind}</span></div>
                  <i className="ti ti-chevron-down field-arrow" />
                </button>
                <button type="button" className="field add-tx-field" onClick={() => setPicker('account')}>
                  <i className="ti ti-building-bank" />
                  <div><span className="field-lbl">Account</span><span className="field-val">{selectedAccount ? `${selectedAccount.name} • ${selectedAccount.currency || currency}` : 'Cash Wallet'}</span></div>
                  <i className="ti ti-chevron-down field-arrow" />
                </button>
              </div>
              <div className="form-stack compact-stack">
                <input className="form-input loan-person-input" type="text" inputMode="text" autoComplete="off" enterKeyHint="next" value={loanPerson} onChange={(e) => setLoanPerson(e.target.value)} placeholder="Person or bank name" />
                <button type="button" className="date-picker-row loan-date-row optional" onClick={() => setLoanCalendarOpen(true)}>
                  <span className="date-picker-icon"><i className="ti ti-calendar-due" /></span>
                  <span className="date-picker-copy"><small>Due date optional</small><b>{loanDueDateValue ? formatCalendarDate(loanDueDateValue) : 'No due date'}</b></span>
                  {loanDueDateValue ? <span className="filter-clear" onClick={(e) => { e.stopPropagation(); setLoanDueDateValue(''); setLoanReminderOpen(false); }}><i className="ti ti-x" /></span> : <i className="ti ti-chevron-right field-arrow" />}
                </button>
                {loanDueDateValue && (
                  <button type="button" className="loan-reminder-time-row loan-reminder-trigger" onClick={() => setLoanReminderOpen(true)}>
                    <span className="loan-reminder-icon"><i className="ti ti-bell-ringing" /></span>
                    <span className="loan-reminder-copy"><small>Reminder notification time</small><b>{formatLoanReminderTime(loanReminderTime)}</b></span>
                    <span className="loan-time-trigger">{formatLoanReminderTime(loanReminderTime)}</span>
                  </button>
                )}
              </div>
            </>
          ) : type !== 'transfer' ? (
            <div className="field-row add-tx-field-row">
              <button type="button" className="field add-tx-field" onClick={() => setPicker('category')}>
                <i className="ti ti-tag" />
                <div><span className="field-lbl">Category</span><span className="field-val">{category}</span></div>
                <i className="ti ti-chevron-down field-arrow" />
              </button>
              <button type="button" className="field add-tx-field" onClick={() => setPicker('account')}>
                <i className="ti ti-building-bank" />
                <div><span className="field-lbl">Account</span><span className="field-val">{selectedAccount ? `${selectedAccount.name} • ${selectedAccount.currency || currency}` : 'Cash Wallet'}</span></div>
                <i className="ti ti-chevron-down field-arrow" />
              </button>
            </div>
          ) : (
            <div className="field-row add-tx-field-row">
              <button type="button" className="field add-tx-field" onClick={() => setPicker('from')}>
                <i className="ti ti-arrow-up-right" />
                <div><span className="field-lbl">From</span><span className="field-val">{fromAccount ? `${fromAccount.name} • ${fromAccount.currency || currency}` : 'Select'}</span></div>
                <i className="ti ti-chevron-down field-arrow" />
              </button>
              <button type="button" className="field add-tx-field" onClick={() => setPicker('to')}>
                <i className="ti ti-arrow-down-left" />
                <div><span className="field-lbl">To</span><span className="field-val">{toAccount ? `${toAccount.name} • ${toAccount.currency || currency}` : 'Select'}</span></div>
                <i className="ti ti-chevron-down field-arrow" />
              </button>
            </div>
          )}

              {transferPreview && fromAccount?.currency !== toAccount?.currency && (
                <div className="transfer-preview-line">
                  <i className="ti ti-refresh" /> {formatMoneyForCurrency(amountValue(), fromAccount?.currency || currency, { decimals: 2 })} → {formatMoneyForCurrency(transferPreview.targetAmount, toAccount?.currency || currency, { decimals: 2 })}
                </div>
              )}

              {sameTransferAccount && (
                <div className="transfer-preview-line transfer-warning-line">
                  <i className="ti ti-alert-circle" /> Choose two different accounts for transfer
                </div>
              )}

          <button type="button" className="date-picker-row" onClick={() => setCalendarOpen(true)}>
            <span className="date-picker-icon"><i className="ti ti-calendar" /></span>
            <span className="date-picker-copy"><small>Transaction Date</small><b>{formatCalendarDate(dateValue)}</b></span>
            <i className="ti ti-chevron-down field-arrow" />
          </button>

          <div className="note-input-wrap">
            <i className="ti ti-note" />
            <input className="note-input" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Note optional" />
          </div>

          {type !== 'loan' && (
            <>
              <input
                ref={receiptInputRef}
                className="hidden-scan-input"
                type="file"
                accept="image/*"
                onChange={(event) => { attachReceiptFile(event.target.files?.[0]); event.currentTarget.value = ''; }}
              />
              <button type="button" className="attach-receipt-btn" onClick={() => receiptInputRef.current?.click()}>
                <i className="ti ti-photo-plus" />
                {receiptImage ? 'Change Receipt Photo' : 'Attach Receipt Photo'}
              </button>
            </>
          )}

          {receiptImage && type !== 'loan' && (
            <div className="receipt-preview-card">
              <img src={receiptImage} alt="Receipt preview" />
              <div>
                <b>Receipt attached</b>
                <span>{receiptName || 'Camera photo'}</span>
              </div>
              <button type="button" onClick={() => { setReceiptImage(''); setReceiptName(''); }}><i className="ti ti-x" /></button>
            </div>
          )}

          </div>
          <div className="sheet-save-footer add-tx-save-footer">
            <button className="save-btn" onClick={submit} disabled={!canSaveTransaction}>{isEditMode ? 'Update Transaction' : type === 'loan' ? 'Save Loan Transaction' : 'Save Transaction'}</button>
          </div>
        </div>
      </div>
  );

  return (
    <>
      <ModalPortal>{modal}</ModalPortal>

      <DateCalendarModal
        open={open && calendarOpen}
        title={type === 'loan' ? 'Select Loan Date' : 'Select Transaction Date'}
        value={dateValue}
        onSelect={setDateValue}
        close={() => setCalendarOpen(false)}
      />

      <DateCalendarModal
        open={open && loanCalendarOpen}
        title="Select Loan Due Date"
        value={loanDueDateValue || dateValue}
        onSelect={setLoanDueDateValue}
        close={() => setLoanCalendarOpen(false)}
      />

      <TimePickerModal
        open={open && loanReminderOpen}
        title="Loan Reminder Time"
        value={loanReminderTime}
        onSelect={(value) => setLoanReminderTime(normalizeLoanReminderTime(value))}
        close={() => setLoanReminderOpen(false)}
      />

      <OptionPickerModal
        open={open && !!picker}
        title={pickerTitle}
        options={pickerOptions()}
        value={pickerValue()}
        onSelect={selectPicker}
        close={() => setPicker(null)}
        grid={picker === 'category'}
      />
    </>
  );
}
