import { useMemo, useState } from 'react';
import { currencies } from '../models/currencies';
import { convertCurrency, formatConvertedCurrency, getCurrencyRateLine } from '../utils/currencyConverter';
import { useCurrencyRates } from '../hooks/useCurrencyRates';
import OptionPickerModal from './OptionPickerModal';

function rateBadgeText(source) {
  if (source === 'live') return 'Today live rate';
  if (source === 'cached') return 'Saved today rate';
  return 'Offline estimate';
}

export default function CurrencyConverterModal({ open, close, defaultCurrency = 'LKR' }) {
  const [amount, setAmount] = useState('1000');
  const [fromCode, setFromCode] = useState(defaultCurrency || 'LKR');
  const [toCode, setToCode] = useState(defaultCurrency === 'USD' ? 'LKR' : 'USD');
  const [picker, setPicker] = useState(null);
  const { rates, source, date, loading, error, refreshRates } = useCurrencyRates(open);

  const currencyOptions = useMemo(() => currencies.map((currency) => ({
    value: currency.code,
    label: `${currency.label} (${currency.code})`,
    icon: 'ti-currency-dollar',
    subtitle: currency.symbol
  })), []);

  const converted = convertCurrency(amount, fromCode, toCode, rates);
  const rateLine = getCurrencyRateLine(fromCode, toCode, rates);
  const reverseRateLine = getCurrencyRateLine(toCode, fromCode, rates);
  const fromCurrency = currencies.find((item) => item.code === fromCode) || currencies[0];
  const toCurrency = currencies.find((item) => item.code === toCode) || currencies[0];

  function swapCurrencies() {
    setFromCode(toCode);
    setToCode(fromCode);
  }

  if (!open) return null;

  return (
    <>
      <div className="modal-overlay open" onClick={close}>
        <div className="modal-sheet clean-form-sheet converter-sheet" onClick={(event) => event.stopPropagation()}>
          <div className="modal-handle" />
          <div className="modal-title">Currency Converter</div>
          <div className="converter-card">
            <div className="converter-icon"><i className="ti ti-arrows-exchange-2" /></div>
            <div>
              <small>Converted amount</small>
              <b>{formatConvertedCurrency(converted, toCode)}</b>
              <span>{rateLine}</span>
            </div>
          </div>
          <div className="rate-today-card">
            <div>
              <small>{rateBadgeText(source)} • {date || 'Today'}</small>
              <b>{rateLine}</b>
              <span>{reverseRateLine}</span>
              {error && <em>{error}</em>}
            </div>
            <button className="rate-refresh-btn" type="button" onClick={() => refreshRates({ force: true })} disabled={loading}>
              <i className={`ti ${loading ? 'ti-loader-2 rate-spin' : 'ti-refresh'}`} />
            </button>
          </div>
          <div className="form-stack">
            <label>
              <span className="form-label">Amount</span>
              <input className="form-input" type="number" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0" />
            </label>
            <div className="converter-row">
              <button className="form-picker-btn" type="button" onClick={() => setPicker('from')}>
                <span><i className="ti ti-cash" />{fromCurrency.code}</span>
                <i className="ti ti-chevron-down" />
              </button>
              <button className="converter-swap" type="button" onClick={swapCurrencies} aria-label="Swap currencies"><i className="ti ti-switch-2" /></button>
              <button className="form-picker-btn" type="button" onClick={() => setPicker('to')}>
                <span><i className="ti ti-world-dollar" />{toCurrency.code}</span>
                <i className="ti ti-chevron-down" />
              </button>
            </div>
          </div>
          <button className="save-btn" type="button" onClick={close}>Done</button>
        </div>
      </div>
      <OptionPickerModal open={picker === 'from'} title="From Currency" options={currencyOptions} value={fromCode} onSelect={setFromCode} close={() => setPicker(null)} />
      <OptionPickerModal open={picker === 'to'} title="To Currency" options={currencyOptions} value={toCode} onSelect={setToCode} close={() => setPicker(null)} />
    </>
  );
}
