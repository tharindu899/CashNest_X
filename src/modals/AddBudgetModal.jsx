import { useEffect, useState } from 'react';
import { categoryInfo, colorVar } from '../models/categories';
import OptionPickerModal from './OptionPickerModal';
import { currencies } from '../models/currencies';

const periods = [
  { value: 'Weekly', label: 'Weekly', icon: 'ti-calendar-week', color: 'teal', subtitle: 'Reset every week' },
  { value: 'Monthly', label: 'Monthly', icon: 'ti-calendar-month', color: 'accent', subtitle: 'Reset every month' },
  { value: 'Yearly', label: 'Yearly', icon: 'ti-calendar-stats', color: 'purple', subtitle: 'Reset every year' }
];

export default function AddBudgetModal({ open, close, categories = [], onSave, onCreateCategory, defaultCurrency = 'LKR' }) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Food');
  const [amount, setAmount] = useState('');
  const [period, setPeriod] = useState('Monthly');
  const [note, setNote] = useState('');
  const [currency, setCurrency] = useState(defaultCurrency || 'LKR');
  const [picker, setPicker] = useState(null);
  const defaultCategory = categories[0]?.name || 'Other';

  useEffect(() => {
    if (!open) return;
    setName(''); setCategory(defaultCategory); setAmount(''); setPeriod('Monthly'); setNote(''); setCurrency(defaultCurrency || 'LKR'); setPicker(null);
  }, [open, defaultCurrency, defaultCategory]);

  const selectedCategory = categoryInfo(category, 'expense', categories);

  function submit() {
    const value = Number(amount || 0);
    if (!value || value <= 0) return;
    onSave({ name, category, amount: value, period, note, currency });
    close();
  }

  return (
    <>
      <div className={`modal-overlay ${open ? 'open' : ''}`} onClick={close}>
        <div className="modal-sheet clean-form-sheet" onClick={(event) => event.stopPropagation()}>
          <div className="modal-handle" />
          <div className="modal-title">Add Budget</div>
          <div className="budget-top-card">
            <span className="budget-top-icon" style={{ color: colorVar(selectedCategory.color), background: `color-mix(in srgb, ${colorVar(selectedCategory.color)} 14%, transparent)` }}><i className={`ti ${selectedCategory.icon}`} /></span>
            <div><b>{category}</b><small>{period} limit</small></div>
          </div>
          <div className="form-stack">
            <label><span className="form-label">Budget Name</span><input className="form-input" value={name} onChange={(e) => setName(e.target.value)} placeholder={`${category} Budget`} /></label>
            <label><span className="form-label">Amount ({currency})</span><input className="form-input" type="number" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" /></label>
            <button type="button" className="form-picker-btn full-picker" onClick={() => setPicker('currency')}><span><i className="ti ti-currency-dollar" />Budget currency • {currency}</span><i className="ti ti-chevron-down" /></button>
            <div className="field-row">
              <div>
                <span className="form-label">Category</span>
                <button type="button" className="form-picker-btn" onClick={() => setPicker('category')}><span><i className={`ti ${selectedCategory.icon}`} />{category}</span><i className="ti ti-chevron-down" /></button>
              </div>
              <div>
                <span className="form-label">Period</span>
                <button type="button" className="form-picker-btn" onClick={() => setPicker('period')}><span><i className="ti ti-calendar-month" />{period}</span><i className="ti ti-chevron-down" /></button>
              </div>
            </div>
            <label><span className="form-label">Note</span><input className="form-input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional" /></label>
          </div>
          <button className="save-btn" onClick={submit}>Save Budget</button>
        </div>
      </div>

      <OptionPickerModal
        open={open && picker === 'category'}
        title="Choose Budget Category"
        value={category}
        options={[...categories.map((item) => ({ value: item.name, label: item.name, icon: item.icon, color: item.color })), { value: '__create__', label: 'Create New Category', icon: 'ti-plus', color: 'accent', subtitle: 'Add a custom category' }]} 
        onSelect={(value) => { if (value === '__create__') onCreateCategory?.(); else setCategory(value); }}
        close={() => setPicker(null)}
        grid
      />
      <OptionPickerModal
        open={open && picker === 'currency'}
        title="Budget Currency"
        value={currency}
        options={currencies.map((item) => ({ value: item.code, label: `${item.code} — ${item.label}`, subtitle: `Example: ${item.symbol} 1,000`, icon: 'ti-currency-dollar', color: 'amber' }))}
        onSelect={setCurrency}
        close={() => setPicker(null)}
      />
      <OptionPickerModal
        open={open && picker === 'period'}
        title="Choose Period"
        value={period}
        options={periods}
        onSelect={setPeriod}
        close={() => setPicker(null)}
      />
    </>
  );
}
