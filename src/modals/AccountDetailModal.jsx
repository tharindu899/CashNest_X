import { useEffect, useMemo, useState } from 'react';
import { accountTypes } from '../models/defaultState';
import { currencies } from '../models/currencies';
import { colorVar, categoryColorChoices } from '../models/categories';
import { iconForAccountType } from '../models/accountOptions';
import { formatMoneyForCurrency } from '../utils/currency';
import OptionPickerModal from './OptionPickerModal';
import ConfirmModal from './ConfirmModal';

export default function AccountDetailModal({ account, close, onSave, onDelete }) {
  const [name, setName] = useState('');
  const [type, setType] = useState('Cash Wallet');
  const [currency, setCurrency] = useState('LKR');
  const [openingBalance, setOpeningBalance] = useState('0');
  const [color, setColor] = useState('accent');
  const [hideFromTotal, setHideFromTotal] = useState(false);
  const [picker, setPicker] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const currencyOptions = useMemo(() => currencies.map((item) => ({
    value: item.code,
    label: `${item.label} (${item.code})`,
    icon: 'ti-currency-dollar',
    subtitle: item.symbol
  })), []);

  useEffect(() => {
    if (!account) return;
    setName(account.name || '');
    setType(account.type || 'Cash Wallet');
    setCurrency(account.currency || 'LKR');
    setOpeningBalance(String(account.openingBalance ?? 0));
    setColor(account.color || 'accent');
    setHideFromTotal(!!account.hideFromTotal);
  }, [account]);

  if (!account) return null;
  const isDefaultAccount = account.isDefault || account.id === 'cash-wallet-default' || (account.name === 'Cash Wallet' && account.type === 'Cash Wallet');

  function submit() {
    onSave(account.id, {
      name: isDefaultAccount ? 'Cash Wallet' : name,
      type: isDefaultAccount ? 'Cash Wallet' : type,
      currency,
      openingBalance,
      color,
      hideFromTotal,
      icon: isDefaultAccount ? 'ti-wallet' : iconForAccountType(type)
    });
    close();
  }

  function remove() {
    if (isDefaultAccount) return;
    setConfirmDelete(true);
  }

  function confirmRemove() {
    onDelete(account.id);
    setConfirmDelete(false);
    close();
  }

  return (
    <>
      <div className="modal-overlay open" onClick={close}>
        <div className="modal-sheet clean-form-sheet account-edit-sheet" onClick={(event) => event.stopPropagation()}>
          <div className="modal-handle" />
          <div className="modal-title">{isDefaultAccount ? 'Default Account' : 'Edit Account'}</div>
          <div className="account-edit-hero">
            <span className="account-edit-icon" style={{ color: colorVar(color), background: `color-mix(in srgb, ${colorVar(color)} 16%, transparent)` }}><i className={`ti ${iconForAccountType(type)}`} /></span>
            <div><b>{isDefaultAccount ? 'Cash Wallet' : (name || account.name)}</b><small>{isDefaultAccount ? 'Default account • cannot delete' : `Current balance: ${formatMoneyForCurrency(account.balance || 0, currency)}`}</small></div>
          </div>
          <div className="form-stack">
            <label><span className="form-label">Account Name</span><input className="form-input" value={isDefaultAccount ? 'Cash Wallet' : name} disabled={isDefaultAccount} onChange={(e) => setName(e.target.value)} /></label>
            <div className="field-row">
              <div><span className="form-label">Type</span><button className="form-picker-btn" type="button" disabled={isDefaultAccount} onClick={() => !isDefaultAccount && setPicker('type')}><span><i className={`ti ${iconForAccountType(type)}`} />{isDefaultAccount ? 'Cash Wallet' : type}</span><i className="ti ti-chevron-down" /></button></div>
              <div><span className="form-label">Color</span><button className="form-picker-btn" type="button" onClick={() => setPicker('color')}><span><i className="ti ti-palette" />{color}</span><i className="ti ti-chevron-down" /></button></div>
            </div>
            <div>
              <span className="form-label">Account Currency</span>
              <button className="form-picker-btn" type="button" onClick={() => setPicker('currency')}><span><i className="ti ti-world-dollar" />{currency}</span><i className="ti ti-chevron-down" /></button>
            </div>
            <label><span className="form-label">Current Balance</span><input className="form-input" type="number" inputMode="decimal" value={openingBalance} onChange={(e) => setOpeningBalance(e.target.value)} /></label>
            <button className={`settings-inline-toggle ${hideFromTotal ? 'active' : ''}`} type="button" onClick={() => setHideFromTotal((value) => !value)}>
              <span className="s-icon"><i className={`ti ${hideFromTotal ? 'ti-eye-off' : 'ti-eye'}`} /></span>
              <span><b>Hide from total balance</b><small>{hideFromTotal ? 'This account is hidden from the home total count.' : 'This account is included in total balance.'}</small></span>
              <span className={`toggle ${hideFromTotal ? 'on' : ''}`}><span className="toggle-thumb" /></span>
            </button>
          </div>
          <div className="modal-actions two-actions">
            {isDefaultAccount ? (
              <button className="ghost-btn locked-action" type="button" disabled><i className="ti ti-lock" /> Default</button>
            ) : (
              <button className="danger-btn" type="button" onClick={remove}><i className="ti ti-trash" /> Delete</button>
            )}
            <button className="save-btn" type="button" onClick={submit}>Save</button>
          </div>
        </div>
      </div>
      <ConfirmModal
        open={confirmDelete}
        title={`Delete ${account.name}?`}
        message="Transactions using this account will also be removed. This cannot be undone."
        dangerLabel="Delete"
        onCancel={() => setConfirmDelete(false)}
        onConfirm={confirmRemove}
      />
      <OptionPickerModal open={picker === 'type'} title="Account Type" options={accountTypes.map((item) => ({ value: item, label: item, icon: iconForAccountType(item), color: 'accent' }))} value={type} onSelect={setType} close={() => setPicker(null)} />
      <OptionPickerModal open={picker === 'color'} title="Account Color" options={categoryColorChoices.map((item) => ({ value: item, label: item, icon: 'ti-circle-filled', color: item }))} value={color} onSelect={setColor} close={() => setPicker(null)} />
      <OptionPickerModal open={picker === 'currency'} title="Account Currency" options={currencyOptions} value={currency} onSelect={setCurrency} close={() => setPicker(null)} />
    </>
  );
}
