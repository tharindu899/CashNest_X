import { useEffect, useMemo, useState } from 'react';
import { accountTypes } from '../models/defaultState';
import { currencies } from '../models/currencies';
import { iconForAccountType } from '../models/accountOptions';
import OptionPickerModal from './OptionPickerModal';

export default function AddAccountModal({ open, close, onSave, defaultCurrency = 'LKR' }) {
  const [name, setName] = useState('');
  const [type, setType] = useState('Cash Wallet');
  const [currency, setCurrency] = useState(defaultCurrency || 'LKR');
  const [openingBalance, setOpeningBalance] = useState('');
  const [pickerOpen, setPickerOpen] = useState(null);

  useEffect(() => {
    if (open) setCurrency(defaultCurrency || 'LKR');
  }, [open, defaultCurrency]);

  const currencyOptions = useMemo(() => currencies.map((item) => ({
    value: item.code,
    label: `${item.label} (${item.code})`,
    icon: 'ti-currency-dollar',
    subtitle: item.symbol
  })), []);

  function submit() {
    onSave({ name, type, currency, openingBalance, icon: iconForAccountType(type) });
    setName('');
    setOpeningBalance('');
    setType('Cash Wallet');
    setCurrency(defaultCurrency || 'LKR');
    close();
  }

  return (
    <>
      <div className={`modal-overlay ${open ? 'open' : ''}`} onClick={close}>
        <div className="modal-sheet clean-form-sheet" onClick={(event) => event.stopPropagation()}>
          <div className="modal-handle" />
          <div className="modal-title">Add Account</div>
          <div className="form-stack">
            <label>
              <span className="form-label">Account Name</span>
              <input className="form-input" value={name} onChange={(e) => setName(e.target.value)} placeholder={currency === defaultCurrency ? 'Cash Wallet' : `${currency} Wallet`} />
            </label>

            <div>
              <span className="form-label">Type</span>
              <button type="button" className="form-picker-btn" onClick={() => setPickerOpen('type')}>
                <span><i className={`ti ${iconForAccountType(type)}`} />{type}</span>
                <i className="ti ti-chevron-down" />
              </button>
            </div>

            <div>
              <span className="form-label">Account Currency</span>
              <button type="button" className="form-picker-btn" onClick={() => setPickerOpen('currency')}>
                <span><i className="ti ti-world-dollar" />{currency}</span>
                <i className="ti ti-chevron-down" />
              </button>
            </div>

            <label>
              <span className="form-label">Current Balance</span>
              <input className="form-input" type="number" inputMode="decimal" value={openingBalance} onChange={(e) => setOpeningBalance(e.target.value)} placeholder="Current balance" />
            </label>
          </div>
          <button className="save-btn" onClick={submit}>Save Account</button>
        </div>
      </div>

      <OptionPickerModal
        open={open && pickerOpen === 'type'}
        title="Account Type"
        value={type}
        options={accountTypes.map((item) => ({ value: item, label: item, icon: iconForAccountType(item) }))}
        onSelect={setType}
        close={() => setPickerOpen(null)}
      />
      <OptionPickerModal
        open={open && pickerOpen === 'currency'}
        title="Account Currency"
        value={currency}
        options={currencyOptions}
        onSelect={setCurrency}
        close={() => setPickerOpen(null)}
      />
    </>
  );
}
