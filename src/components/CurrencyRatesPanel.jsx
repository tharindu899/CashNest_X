import { useState } from 'react';
import { currencies } from '../models/currencies';
import CurrencyRateRow from './CurrencyRateRow';

export default function CurrencyRatesPanel({ appCurrency = 'LKR', rateInfo, onRefresh, onEditRate, onResetRate, inModal = false }) {
  const rates = rateInfo?.rates || {};
  const overrides = rateInfo?.overrides || {};
  const [editingCode, setEditingCode] = useState('');
  const [draftRate, setDraftRate] = useState('');

  function startEdit(code) {
    setEditingCode(code);
    setDraftRate(String(rates[code] || ''));
  }

  function cancelEdit() {
    setEditingCode('');
    setDraftRate('');
  }

  function saveEdit(code) {
    const value = Number(draftRate);
    if (!Number.isFinite(value) || value <= 0) return;
    onEditRate?.(code, value);
    cancelEdit();
  }

  return (
    <div className={`settings-section rates-panel ${inModal ? 'inside-modal' : ''}`}>
      {!inModal && <div className="section-label">Today Currency Rates</div>}
      {!inModal && (
        <div className="settings-item rate-refresh-item" onClick={() => onRefresh?.({ force: true })}>
          <div className="s-icon" style={{ background: 'rgba(79,142,247,0.12)', color: 'var(--accent)' }}><i className="ti ti-refresh" /></div>
          <div className="s-text"><div className="s-name">Refresh Rate</div><div className="s-sub">{rateInfo?.loading ? 'Updating…' : `${rateInfo?.source || 'offline'} • ${rateInfo?.date || 'today'}`}</div></div>
          <i className="ti ti-chevron-right s-arrow" />
        </div>
      )}
      {rateInfo?.error && <div className="empty-state mini-empty">{rateInfo.error}</div>}
      <div className="rates-grid-list">
        {currencies.filter((item) => item.code !== appCurrency).map((currency) => (
          <CurrencyRateRow
            key={currency.code}
            currency={currency}
            appCurrency={appCurrency}
            rates={rates}
            isManual={!!overrides[currency.code]}
            editing={editingCode === currency.code}
            draftRate={draftRate}
            setDraftRate={setDraftRate}
            startEdit={startEdit}
            saveEdit={saveEdit}
            cancelEdit={cancelEdit}
            resetRate={(code) => onResetRate?.(code)}
          />
        ))}
      </div>
    </div>
  );
}
