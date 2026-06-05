import { useEffect, useMemo, useState } from 'react';
import { formatMoneyForCurrency } from '../utils/currency';
import { convertCurrency } from '../utils/currencyConverter';
import LoanCurrencyStack from '../components/LoanCurrencyStack';
import LoanPaymentCurrencyStack from '../components/LoanPaymentCurrencyStack';
import { formatCalendarDate, todayInputValue } from './DateCalendarModal';
import DateCalendarModal from './DateCalendarModal';
import OptionPickerModal from './OptionPickerModal';
import ConfirmModal from './ConfirmModal';
import useKeyboardSheet from '../hooks/useKeyboardSheet';
import { formatLoanReminderTime } from '../utils/loanReminder';

export default function LoanDetailModal({ loan, close, onDelete, onEdit, onPay, onUpdatePayment, onDeletePayment, onMarkPaid, editPaymentTransaction = null, clearEditPayment, appCurrency = 'LKR', conversionRates, accounts = [] }) {
  const [payment, setPayment] = useState('');
  const [note, setNote] = useState('');
  const [dateValue, setDateValue] = useState(todayInputValue());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [accountPickerOpen, setAccountPickerOpen] = useState(false);
  const [paymentAccountId, setPaymentAccountId] = useState('');
  const [editingPaymentId, setEditingPaymentId] = useState('');
  const [editingOriginal, setEditingOriginal] = useState(null);
  const [activeTab, setActiveTab] = useState('payment');
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deletePaymentTarget, setDeletePaymentTarget] = useState(null);
  const payments = useMemo(() => loan?.payments || [], [loan]);
  const { ref: sheetRef, keyboardOpen } = useKeyboardSheet(!!loan);


  useEffect(() => {
    if (!loan || !editPaymentTransaction || editPaymentTransaction.loanId !== loan.id) return;
    const matchedPayment = (loan.payments || []).find((item) => {
      if (editPaymentTransaction.loanPaymentId && item.id === editPaymentTransaction.loanPaymentId) return true;
      if (editPaymentTransaction.id && item.transactionId === editPaymentTransaction.id) return true;
      return Number(item.amount || 0) === Number(editPaymentTransaction.amount || 0)
        && (item.dateValue || '') === (editPaymentTransaction.dateValue || '')
        && String(item.note || '') === String(editPaymentTransaction.note || '')
        && (!editPaymentTransaction.accountId || item.accountId === editPaymentTransaction.accountId);
    });
    const nextAccountId = matchedPayment?.accountId || editPaymentTransaction.accountId || loan.accountId || '';
    const loanCurrencyCode = loan.currency || appCurrency || 'LKR';
    const nextAccount = accounts.find((account) => account.id === nextAccountId) || accounts.find((account) => account.id === loan.accountId) || accounts[0];
    const accountCurrency = nextAccount?.currency || editPaymentTransaction.accountCurrency || editPaymentTransaction.currency || loanCurrencyCode;
    const amountValue = Number(
      matchedPayment?.amount
      ?? editPaymentTransaction.loanAmount
      ?? convertCurrency(editPaymentTransaction.accountAmount ?? editPaymentTransaction.amount ?? 0, editPaymentTransaction.accountCurrency || editPaymentTransaction.currency || accountCurrency, loanCurrencyCode, conversionRates)
      ?? 0
    );
    const paymentInputValue = Number(
      matchedPayment?.accountAmount
      ?? editPaymentTransaction.accountAmount
      ?? (editPaymentTransaction.currency === accountCurrency ? editPaymentTransaction.amount : convertCurrency(amountValue, loanCurrencyCode, accountCurrency, conversionRates))
      ?? 0
    );
    const date = matchedPayment?.dateValue || editPaymentTransaction.dateValue || todayInputValue();
    const noteValue = matchedPayment?.note ?? editPaymentTransaction.note ?? '';
    setPayment(paymentInputValue ? String(Number(paymentInputValue.toFixed(2))) : '');
    setDateValue(date);
    setNote(noteValue);
    setPaymentAccountId(nextAccountId);
    setEditingPaymentId(matchedPayment?.id || editPaymentTransaction.loanPaymentId || '');
    setEditingOriginal({
      amount: amountValue,
      accountAmount: matchedPayment?.accountAmount ?? editPaymentTransaction.accountAmount ?? 0,
      accountCurrency: matchedPayment?.accountCurrency || editPaymentTransaction.accountCurrency || '',
      dateValue: date,
      note: noteValue,
      transactionId: editPaymentTransaction.id || ''
    });
    setActiveTab('payment');
  }, [accounts, appCurrency, conversionRates, editPaymentTransaction, loan]);



  function resetPaymentEditor() {
    setPayment('');
    setNote('');
    setDateValue(todayInputValue());
    setEditingPaymentId('');
    setEditingOriginal(null);
    clearEditPayment?.();
  }

  if (!loan) return null;

  const paid = Number(loan.paid || 0);
  const total = Number(loan.amount || 0);
  const remaining = Math.max(0, total - paid);
  const progress = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;
  const isLend = loan.type === 'Lending';
  const done = remaining <= 0;
  const loanCurrency = loan.currency || appCurrency || 'LKR';
  const paymentAccount = accounts.find((account) => account.id === paymentAccountId) || accounts.find((account) => account.id === loan.accountId) || accounts[0];
  const paymentCurrency = paymentAccount?.currency || loanCurrency;
  const paymentAccountOptions = accounts.map((account) => ({ value: account.id, label: account.name, icon: account.icon || 'ti-wallet', color: account.color || 'accent', subtitle: `${account.currency || appCurrency} • ${account.hideFromTotal ? 'Hidden from total' : 'Visible total'}` }));
  const editingPayment = !!(editingPaymentId || editingOriginal?.transactionId);
  const shownTab = done ? 'history' : activeTab;

  function toPaymentCurrency(amount, accountId = paymentAccount?.id || '') {
    const account = accounts.find((item) => item.id === accountId) || paymentAccount;
    const accountCurrency = account?.currency || loanCurrency;
    return convertCurrency(Number(amount || 0), loanCurrency, accountCurrency, conversionRates);
  }

  function addPayment() {
    const value = Number(payment || 0);
    if (!value || value <= 0) return;
    if (editingPaymentId || editingOriginal?.transactionId) {
      onUpdatePayment?.(loan.id, editingPaymentId, {
        amount: value,
        amountCurrency: paymentCurrency,
        dateValue,
        note,
        accountId: paymentAccount?.id || '',
        rates: conversionRates,
        transactionId: editingOriginal?.transactionId || editPaymentTransaction?.id || '',
        originalAmount: editingOriginal?.amount,
        originalDateValue: editingOriginal?.dateValue,
        originalNote: editingOriginal?.note
      });
      resetPaymentEditor();
      return;
    }
    onPay?.(loan.id, { amount: value, amountCurrency: paymentCurrency, dateValue, note, accountId: paymentAccount?.id || '', rates: conversionRates });
    resetPaymentEditor();
  }

  return (
    <>
      <div className="choice-overlay open loan-detail-overlay" onClick={close}>
        <div ref={sheetRef} className={`choice-sheet loan-detail-sheet old-loan-pay-sheet ${done ? 'loan-complete-only-history' : ''} ${keyboardOpen ? 'keyboard-mode' : ''}`} onClick={(event) => event.stopPropagation()}>
          <div className="modal-handle" />
          <div className="loan-detail-content">
          <div className="loan-detail-head">
            <div className="loan-avatar large" style={{ background: isLend ? 'linear-gradient(135deg,#30d48a,#2dd4bf)' : 'linear-gradient(135deg,#f05c6e,#f5a623)' }}>{(loan.person || 'LN').slice(0, 2).toUpperCase()}</div>
            <div>
              <div className="choice-title loan-detail-title">{loan.person || 'Loan'}</div>
              <div className="loan-type">{loan.type} • {loanCurrency} • {loan.dueDateValue ? `Due ${formatCalendarDate(loan.dueDateValue)} • ${formatLoanReminderTime(loan.reminderTime)}` : 'No due date'}</div>
            </div>
          </div>

          <div className="loan-detail-stats">
            <div><small>Total</small><LoanCurrencyStack amount={total} currency={loanCurrency} appCurrency={appCurrency} rates={conversionRates} /></div>
            <div><small>Paid</small><LoanCurrencyStack amount={paid} currency={loanCurrency} appCurrency={appCurrency} rates={conversionRates} tone={isLend ? 'var(--green)' : 'var(--red)'} /></div>
            <div><small>Remaining</small><LoanCurrencyStack amount={remaining} currency={loanCurrency} appCurrency={appCurrency} rates={conversionRates} /></div>
          </div>

          <div className="loan-progress big"><div className="loan-bar" style={{ width: `${progress}%`, background: done ? 'var(--green)' : isLend ? 'var(--green)' : 'var(--red)' }} /></div>
          <div className="loan-meta"><span>{progress}% paid</span><span>{done ? 'Completed' : `${formatMoneyForCurrency(remaining, loanCurrency, { decimals: 0 })} left`}</span></div>

          <div className={`loan-detail-tabs ${done ? 'single-history-tab' : ''}`} role="tablist" aria-label="Loan detail tabs">
            {!done && <button type="button" className={shownTab === 'payment' ? 'active' : ''} onClick={() => setActiveTab('payment')}><i className="ti ti-cash" /> Payment</button>}
            <button type="button" className={shownTab === 'history' ? 'active' : ''} onClick={() => setActiveTab('history')}><i className="ti ti-history" /> History</button>
          </div>

          {!done && shownTab === 'payment' && (
            <div className="loan-pay-box old-loan-pay-box">
              <div className="loan-pay-title"><i className="ti ti-cash" /> {editingPayment ? 'Edit payment' : 'Add payment'}</div>
              <div className="loan-pay-row">
                <input className="form-input" type="number" inputMode="decimal" value={payment} onChange={(event) => setPayment(event.target.value)} placeholder={`Amount in ${paymentCurrency}`} />
                <button type="button" className="form-picker-btn loan-pay-date" onClick={() => setCalendarOpen(true)}><i className="ti ti-calendar" /> {formatCalendarDate(dateValue)}</button>
              </div>
              <button type="button" className="form-picker-btn full-picker" onClick={() => setAccountPickerOpen(true)}><span><i className="ti ti-wallet" />{paymentAccount ? `${paymentAccount.name} • ${paymentAccount.currency || appCurrency}` : 'Select account'}</span><i className="ti ti-chevron-down" /></button>
              <input className="form-input" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Payment note optional" />
              <div className="loan-action-grid loan-payment-actions old-loan-payment-actions">
                <button className="wide-action-btn" type="button" onClick={addPayment}><i className={`ti ${editingPayment ? 'ti-device-floppy' : 'ti-plus'}`} /> {editingPayment ? 'Update Payment' : 'Add Payment'}</button>
                {editingPayment ? (
                  <button className="wide-action-btn secondary" type="button" onClick={resetPaymentEditor}><i className="ti ti-x" /> Cancel Edit</button>
                ) : (
                  <button className="wide-action-btn secondary" type="button" onClick={() => onMarkPaid?.(loan.id, { accountId: paymentAccount?.id || '', rates: conversionRates })}><i className="ti ti-checks" /> Mark Fully Paid</button>
                )}
              </div>
            </div>
          )}

          {shownTab === 'history' && <div className="loan-payment-list">
            <div className="loan-payment-heading">Payment history</div>
            {!payments.length && <div className="empty-state mini-empty">No payments yet.</div>}
            {payments.map((paymentItem) => {
              const editPaymentItem = () => {
                if (done) return;
                const nextAccountId = paymentItem.accountId || loan.accountId || '';
                const savedAccountAmount = Number(paymentItem.accountAmount || 0);
                const inputAmount = savedAccountAmount > 0 ? savedAccountAmount : toPaymentCurrency(paymentItem.amount, nextAccountId);
                setPayment(inputAmount ? String(Number(inputAmount.toFixed(2))) : '');
                setDateValue(paymentItem.dateValue || todayInputValue());
                setNote(paymentItem.note || '');
                setPaymentAccountId(nextAccountId);
                setEditingPaymentId(paymentItem.id || '');
                setEditingOriginal({
                  amount: Number(paymentItem.amount || 0),
                  accountAmount: Number(paymentItem.accountAmount || 0),
                  accountCurrency: paymentItem.accountCurrency || '',
                  dateValue: paymentItem.dateValue || '',
                  note: paymentItem.note || '',
                  transactionId: paymentItem.transactionId || ''
                });
                setActiveTab('payment');
              };
              return (
                <div className="loan-payment-item loan-payment-item-with-actions" key={paymentItem.id}>
                  <button className="loan-payment-edit-btn" type="button" onClick={editPaymentItem} disabled={done}>
                    <span className="payment-dot" />
                    <div><LoanPaymentCurrencyStack payment={paymentItem} loanCurrency={loanCurrency} appCurrency={appCurrency} /><small>{paymentItem.dateValue ? formatCalendarDate(paymentItem.dateValue) : 'No date'}{paymentItem.accountName ? ` • ${paymentItem.accountName}` : ''}{paymentItem.note ? ` • ${paymentItem.note}` : ''}</small></div>
                  </button>
                  <button className="loan-payment-delete-btn" type="button" onClick={() => setDeletePaymentTarget(paymentItem)} aria-label="Delete payment"><i className="ti ti-trash" /></button>
                </div>
              );
            })}
          </div>}

          </div>
          <div className="loan-action-grid danger-row loan-detail-footer-actions">
            <button className="secondary-btn loan-close-btn" type="button" onClick={() => { resetPaymentEditor(); close(); }}>Close</button>
            <button className="secondary-btn loan-edit-btn" type="button" onClick={() => { resetPaymentEditor(); onEdit?.(loan); }}><i className="ti ti-edit" /> Edit</button>
            <button className="mini-danger-btn text-danger loan-delete-btn" type="button" onClick={() => setConfirmDeleteOpen(true)}><i className="ti ti-trash" /> Delete</button>
          </div>
        </div>
      </div>
      <ConfirmModal
        open={confirmDeleteOpen}
        title="Delete loan?"
        message={`This will permanently delete “${loan.person || 'this loan'}” and its loan records. This cannot be undone.`}
        dangerLabel="Delete Loan"
        cancelLabel="Keep"
        icon="ti-trash"
        onCancel={() => setConfirmDeleteOpen(false)}
        onConfirm={() => { onDelete?.(loan.id); setConfirmDeleteOpen(false); close?.(); }}
      />
      <ConfirmModal
        open={!!deletePaymentTarget}
        title="Delete payment?"
        message={`This will remove ${deletePaymentTarget ? formatMoneyForCurrency(Number(deletePaymentTarget.amount || 0), loanCurrency, { decimals: 0 }) : 'this payment'} from “${loan.person || 'this loan'}” and update the remaining balance.`}
        dangerLabel="Delete Payment"
        cancelLabel="Keep"
        icon="ti-trash"
        onCancel={() => setDeletePaymentTarget(null)}
        onConfirm={() => {
          if (deletePaymentTarget) {
            onDeletePayment?.(loan.id, deletePaymentTarget.id, deletePaymentTarget);
            if (editingPaymentId && editingPaymentId === deletePaymentTarget.id) resetPaymentEditor();
          }
          setDeletePaymentTarget(null);
        }}
      />
      <DateCalendarModal open={calendarOpen} title="Payment Date" value={dateValue} onSelect={setDateValue} close={() => setCalendarOpen(false)} />
      <OptionPickerModal open={accountPickerOpen} title="Payment Account" options={paymentAccountOptions} value={paymentAccount?.id || ''} onSelect={setPaymentAccountId} close={() => setAccountPickerOpen(false)} />
    </>
  );
}

