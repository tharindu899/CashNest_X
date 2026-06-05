import { useMemo, useState } from 'react';
import { currencies } from '../models/currencies';

const steps = [
  { key: 'name', label: 'Name', icon: 'ti-user-heart' },
  { key: 'currency', label: 'Currency', icon: 'ti-currency-dollar' },
  { key: 'balance', label: 'Current balance', icon: 'ti-wallet' },
  { key: 'finish', label: 'Finish', icon: 'ti-sparkles' }
];

function cleanAmount(value) {
  const next = String(value || '').replace(/[^0-9.]/g, '');
  const parts = next.split('.');
  if (parts.length <= 1) return next;
  return `${parts[0]}.${parts.slice(1).join('').slice(0, 2)}`;
}

export default function WelcomeSetup({ defaultCurrency = 'LKR', onComplete }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    name: '',
    currency: defaultCurrency || 'LKR',
    currentBalance: '',
    monthlyIncome: '',
    theme: 'dark',
    notifications: true
  });

  const selectedCurrency = useMemo(
    () => currencies.find((item) => item.code === form.currency) || currencies[0],
    [form.currency]
  );

  const progress = ((step + 1) / steps.length) * 100;
  const canContinue = step !== 0 || form.name.trim().length >= 2;

  function update(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function next() {
    if (!canContinue) return;
    if (step < steps.length - 1) setStep((value) => value + 1);
    else {
      onComplete?.({
        name: form.name.trim() || 'Friend',
        currency: form.currency || 'LKR',
        currentBalance: Number(form.currentBalance || 0),
        monthlyIncome: Number(form.monthlyIncome || 0),
        theme: form.theme,
        notifications: Boolean(form.notifications)
      });
    }
  }

  function back() {
    if (step > 0) setStep((value) => value - 1);
  }

  return (
    <div className="welcome-setup">
      <div className="welcome-orb welcome-orb-one" />
      <div className="welcome-orb welcome-orb-two" />
      <div className="welcome-card">
        <div className="welcome-top">
          <div className="welcome-logo">
            <i className="ti ti-wallet" />
          </div>
          <div>
            <p>Welcome to</p>
            <h1>CashNest X</h1>
          </div>
        </div>

        <div className="welcome-progress"><span style={{ width: `${progress}%` }} /></div>
        <div className="welcome-steps">
          {steps.map((item, index) => (
            <button key={item.key} className={index === step ? 'active' : index < step ? 'done' : ''} type="button" onClick={() => index < step && setStep(index)}>
              <i className={`ti ${item.icon}`} />
            </button>
          ))}
        </div>

        {step === 0 && (
          <section className="welcome-panel welcome-animate">
            <span className="welcome-kicker">Start setup</span>
            <h2>What should we call you?</h2>
            <p>Your name is used only inside the app to make the dashboard feel personal.</p>
            <label className="welcome-input-wrap">
              <i className="ti ti-user" />
              <input autoFocus value={form.name} onChange={(event) => update('name', event.target.value)} placeholder="Enter your name" maxLength={24} />
            </label>
          </section>
        )}

        {step === 1 && (
          <section className="welcome-panel welcome-animate">
            <span className="welcome-kicker">Money format</span>
            <h2>Choose your currency</h2>
            <p>CashNest X will format all balances, reports, and exports with this currency.</p>
            <div className="currency-grid">
              {currencies.map((currency) => (
                <button key={currency.code} className={currency.code === form.currency ? 'selected' : ''} type="button" onClick={() => update('currency', currency.code)}>
                  <strong>{currency.symbol}</strong>
                  <span>{currency.code}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {step === 2 && (
          <section className="welcome-panel welcome-animate">
            <span className="welcome-kicker">First account</span>
            <h2>Add your current balance</h2>
            <p>Enter the money you have now in your Cash Wallet. You can edit it later from the account edit screen.</p>
            <label className="welcome-input-wrap amount">
              <b>{selectedCurrency.symbol}</b>
              <input inputMode="decimal" value={form.currentBalance} onChange={(event) => update('currentBalance', cleanAmount(event.target.value))} placeholder="0.00" />
            </label>
            <label className="welcome-mini-field">
              <span>Monthly income / allowance optional</span>
              <input inputMode="decimal" value={form.monthlyIncome} onChange={(event) => update('monthlyIncome', cleanAmount(event.target.value))} placeholder="Optional" />
            </label>
          </section>
        )}

        {step === 3 && (
          <section className="welcome-panel welcome-animate">
            <span className="welcome-kicker">Almost done</span>
            <h2>Make it yours</h2>
            <p>Pick a look and choose whether CashNest X can show reminders and export alerts.</p>
            <div className="welcome-choice-row">
              <button className={form.theme === 'dark' ? 'selected' : ''} type="button" onClick={() => update('theme', 'dark')}>
                <i className="ti ti-moon-stars" /> Dark
              </button>
              <button className={form.theme === 'light' ? 'selected' : ''} type="button" onClick={() => update('theme', 'light')}>
                <i className="ti ti-sun" /> Light
              </button>
            </div>
            <button className={`welcome-toggle ${form.notifications ? 'on' : ''}`} type="button" onClick={() => update('notifications', !form.notifications)}>
              <span><i className="ti ti-bell" /> Notifications</span>
              <b>{form.notifications ? 'On' : 'Off'}</b>
            </button>
          </section>
        )}

        <div className="welcome-actions">
          <button className="welcome-back" type="button" onClick={back} disabled={step === 0}>Back</button>
          <button className="welcome-next" type="button" onClick={next} disabled={!canContinue}>
            {step === steps.length - 1 ? 'Enter app' : 'Continue'}
            <i className={`ti ${step === steps.length - 1 ? 'ti-check' : 'ti-arrow-right'}`} />
          </button>
        </div>
      </div>
    </div>
  );
}
