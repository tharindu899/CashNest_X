import { useEffect, useMemo, useState } from 'react';
import ModalPortal from '../../components/ModalPortal';
import useKeyboardSheet from '../../hooks/useKeyboardSheet';
import DateCalendarModal, { todayInputValue, formatCalendarDate } from '../../modals/DateCalendarModal';
import OptionPickerModal from '../../modals/OptionPickerModal';

function cleanAmount(value) {
  const normal = String(value || '').replace(/,/g, '.').replace(/[^0-9.]/g, '');
  const parts = normal.split('.');
  if (parts.length <= 1) return parts[0];
  return `${parts[0]}.${parts.slice(1).join('').slice(0, 2)}`;
}

export default function ReceiptReviewModal({ open, scan, categories = [], close, onUse }) {
  const [amount, setAmount] = useState('');
  const [merchant, setMerchant] = useState('');
  const [dateValue, setDateValue] = useState(todayInputValue());
  const [category, setCategory] = useState('Bills');
  const [showText, setShowText] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const { ref: sheetRef, keyboardOpen } = useKeyboardSheet(open);

  useEffect(() => {
    if (!open || !scan) return;
    setAmount(scan.amount || '');
    setMerchant(scan.merchant || 'Scanned Receipt');
    setDateValue(scan.dateValue || todayInputValue());
    const detectedCategory = categories.some((item) => item?.name === scan.category) ? scan.category : '';
    setCategory(detectedCategory || categories[0]?.name || 'Other');
    setShowText(false);
    setCalendarOpen(false);
    setCategoryOpen(false);
  }, [open, scan, categories]);

  const categoryOptions = useMemo(() => {
    const byName = new Map();
    categories.forEach((item) => {
      if (!item?.name) return;
      byName.set(item.name, {
        value: item.name,
        label: item.name,
        icon: item.icon || 'ti-tag',
        color: item.color || 'accent'
      });
    });
    if (!byName.size) byName.set('Other', { value: 'Other', label: 'Other', icon: 'ti-dots', color: 'accent' });
    if (category && !byName.has(category)) byName.set(category, { value: category, label: category, icon: 'ti-tag', color: 'accent' });
    return Array.from(byName.values());
  }, [categories, category]);

  if (!open || !scan) return null;

  const canAdd = Number(amount) > 0;
  const confidenceText = [
    amount ? 'Amount found' : 'Amount missing',
    scan.dateValue ? 'Date found' : 'Using today',
    scan.merchant ? 'Shop found' : 'Shop needs check'
  ].join(' • ');

  const modal = (
    <>
      <div className={`modal-overlay receipt-review-overlay open ${keyboardOpen ? 'keyboard-mode' : ''}`} onClick={close}>
        <div
          className={`modal-sheet receipt-review-sheet ${keyboardOpen ? 'keyboard-mode' : ''}`}
          ref={sheetRef}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="modal-handle" />
          <div className="receipt-review-head">
            <span className="receipt-review-icon"><i className="ti ti-scan-eye" /></span>
            <div>
              <div className="modal-title">Review Scanned Receipt</div>
              <p>{confidenceText}</p>
            </div>
          </div>

          <div className="receipt-review-scroll">
            {scan.receiptImage && <img className="receipt-review-photo" src={scan.receiptImage} alt="Scanned receipt" />}

            <div className="receipt-review-grid">
              <label className="review-field">
                <span>Amount</span>
                <input
                  inputMode="decimal"
                  value={amount}
                  onChange={(event) => setAmount(cleanAmount(event.target.value))}
                  placeholder="0.00"
                  autoComplete="off"
                />
              </label>

              <button type="button" className="review-field review-picker-field" onClick={() => setCalendarOpen(true)}>
                <span>Date</span>
                <b>{dateValue ? formatCalendarDate(dateValue) : 'Pick date'}</b>
                <small>{dateValue || 'Tap to choose'}</small>
                <i className="ti ti-calendar" />
              </button>

              <label className="review-field wide">
                <span>Shop name</span>
                <input
                  value={merchant}
                  onChange={(event) => setMerchant(event.target.value)}
                  placeholder="Shop name"
                  autoComplete="off"
                />
              </label>

              <button type="button" className="review-field review-picker-field wide" onClick={() => setCategoryOpen(true)}>
                <span>Category</span>
                <b>{category || 'Choose category'}</b>
                <small>Tap to change category</small>
                <i className="ti ti-chevron-right" />
              </button>
            </div>

            <button type="button" className="receipt-text-toggle" onClick={() => setShowText((value) => !value)}>
              <i className="ti ti-file-text" /> {showText ? 'Hide detected text' : 'Show detected text'}
            </button>
            {showText && <pre className="receipt-detected-text">{scan.text || scan.ocrText || 'No text detected. You can still add the receipt photo manually.'}</pre>}

            {!canAdd && <div className="receipt-warning"><i className="ti ti-alert-triangle" /> Check the amount before adding this transaction.</div>}
          </div>

          <div className="receipt-review-actions">
            <button type="button" className="secondary-btn" onClick={close}>Cancel</button>
            <button
              type="button"
              className="save-btn"
              disabled={!canAdd}
              onClick={() => onUse?.({ ...scan, amount, merchant: merchant.trim() || 'Scanned Receipt', dateValue, category })}
            >
              Add Transaction
            </button>
          </div>
        </div>
      </div>

      <DateCalendarModal
        open={calendarOpen}
        title="Receipt Date"
        value={dateValue}
        onSelect={setDateValue}
        close={() => setCalendarOpen(false)}
      />

      <OptionPickerModal
        open={categoryOpen}
        title="Receipt Category"
        options={categoryOptions}
        value={category}
        onSelect={(value) => setCategory(value)}
        close={() => setCategoryOpen(false)}
        variant="receipt-category"
      />
    </>
  );

  return <ModalPortal>{modal}</ModalPortal>;
}
