import { getCurrencyRateLine } from '../utils/currencyConverter';

export default function CurrencyRateRow({ currency, appCurrency, rates, isManual, editing, draftRate, setDraftRate, startEdit, saveEdit, cancelEdit, resetRate }) {
  return (
    <div className={`settings-item currency-rate-item ${editing ? 'editing' : ''}`}>
      <div className="currency-rate-main">
        <div className="s-icon currency-code-icon">{currency.symbol}</div>

        <div className="s-text rate-info">
          <div className="s-name">{currency.code}</div>
          <div className="s-sub">{getCurrencyRateLine(currency.code, appCurrency, rates)}</div>
        </div>

        <div className="rate-actions">
          {isManual ? <span className="manual-rate-pill">Manual</span> : <span className="manual-rate-pill muted">Live</span>}
          <button type="button" onClick={() => startEdit(currency.code)} aria-label={`Edit ${currency.code} rate`}>
            <i className="ti ti-edit" />
          </button>
          {isManual ? (
            <button type="button" onClick={() => resetRate(currency.code)} aria-label={`Reset ${currency.code} live rate`}>
              <i className="ti ti-refresh-dot" />
            </button>
          ) : null}
        </div>
      </div>

      {editing && (
        <div className="rate-edit-box">
          <label>LKR value for 1 {currency.code}</label>
          <input
            inputMode="decimal"
            type="number"
            min="0"
            step="0.01"
            value={draftRate}
            onChange={(event) => setDraftRate(event.target.value)}
            placeholder={`Enter ${currency.code} rate`}
          />
          <div className="rate-edit-actions">
            <button type="button" onClick={() => saveEdit(currency.code)} disabled={!Number(draftRate) || Number(draftRate) <= 0}>Save</button>
            <button type="button" className="ghost" onClick={cancelEdit}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
