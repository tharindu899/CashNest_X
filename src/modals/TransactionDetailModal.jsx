import { useState } from 'react';
import { colorVar } from '../models/categories';
import { formatMoneyForCurrency } from '../utils/currency';
import { getTransactionCurrency } from '../utils/accountViewTotals';
import ConvertedMainAmount from '../components/ConvertedMainAmount';
import { getLoanTransactionMeta, getLoanTransactionTypeLabel, isLoanLedgerTransaction } from '../utils/loanTransactionLinks';
import { getTransferDisplayAmount } from '../utils/transferCurrency';
import ConfirmModal from './ConfirmModal';

export default function TransactionDetailModal({ transaction, accounts, appCurrency = 'LKR', conversionRates, close, onDelete, onEdit }) {
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  if (!transaction) return null;
  const tx = transaction;
  const sign = tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : '';
  const color = tx.type === 'income' ? 'var(--green)' : tx.type === 'expense' ? 'var(--red)' : 'var(--accent)';
  const fromAccount = accounts.find((a) => a.id === tx.fromAccountId);
  const toAccount = accounts.find((a) => a.id === tx.toAccountId);
  const txAccount = accounts.find((a) => a.id === tx.accountId);
  const isLoanTx = isLoanLedgerTransaction(tx);
  const meta = isLoanTx ? getLoanTransactionMeta(tx) : tx.type === 'transfer' ? `${fromAccount?.name || 'From'} → ${toAccount?.name || 'To'}` : `${tx.category} • ${tx.accountName}`;
  const currencyCode = tx.type === 'transfer' ? (tx.currency || fromAccount?.currency || appCurrency) : (tx.currency || getTransactionCurrency(tx, accounts, txAccount?.currency || fromAccount?.currency || 'LKR'));
  const displayAmount = tx.type === 'transfer' ? getTransferDisplayAmount(tx, accounts, tx.fromAccountId) : Number(tx.amount || 0);

  function confirmDelete() {
    onDelete?.(tx.id);
    setConfirmDeleteOpen(false);
    close?.();
  }

  return (
    <>
    <div className="modal-overlay open" onClick={close}>
      <div className="modal-sheet detail-sheet" onClick={(event) => event.stopPropagation()}>
        <div className="modal-handle" />
        <div className="detail-top">
          <div className="detail-icon" style={{ color: colorVar(tx.color || 'accent') }}><i className={`ti ${tx.icon || 'ti-receipt'}`} /></div>
          <div className="detail-title">{tx.title}</div>
          <div className="detail-amount" style={{ color }}>{sign}{formatMoneyForCurrency(displayAmount, currencyCode, { decimals: 0 })}</div>
          <ConvertedMainAmount transaction={tx} accounts={accounts} appCurrency={appCurrency} rates={conversionRates} className="detail-converted-amount" />
          <div className="detail-meta">{meta}</div>
        </div>
        {tx.receiptImage && (
          <div className="detail-receipt-card">
            <img src={tx.receiptImage} alt="Receipt" />
            <span>{tx.receiptName || 'Scanned receipt'}</span>
          </div>
        )}
        <div className="detail-list">
          <div className="detail-row"><span>Type</span><b>{isLoanTx ? getLoanTransactionTypeLabel(tx) : tx.type}</b></div>
          <div className="detail-row"><span>Date</span><b>{tx.date || 'Today'}</b></div>
          <div className="detail-row"><span>Account</span><b>{tx.type === 'transfer' ? meta : tx.accountName}</b></div>
          <div className="detail-row"><span>Currency</span><b>{tx.type === 'transfer' && tx.toCurrency ? `${currencyCode} → ${tx.toCurrency}` : currencyCode}</b></div>
          {tx.type === 'transfer' && tx.toCurrency && <div className="detail-row"><span>Received</span><b>{formatMoneyForCurrency(tx.toAmount ?? tx.amount, tx.toCurrency, { decimals: 2 })}</b></div>}
        </div>
        <div className="modal-actions detail-actions-three">
          <button className="secondary-btn" onClick={close}>Close</button>
          <button className="secondary-btn edit-btn" onClick={() => onEdit?.(tx)}>Edit</button>
          <button className="secondary-btn danger-btn" onClick={() => setConfirmDeleteOpen(true)}>Delete</button>
        </div>
      </div>
    </div>
    <ConfirmModal
      open={confirmDeleteOpen}
      title="Delete transaction?"
      message={`This will permanently delete “${tx.title || 'this transaction'}”. This cannot be undone.`}
      dangerLabel="Delete"
      cancelLabel="Keep"
      icon="ti-trash"
      onCancel={() => setConfirmDeleteOpen(false)}
      onConfirm={confirmDelete}
    />
    </>
  );
}
