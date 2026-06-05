import { useEffect, useMemo, useRef, useState } from 'react';

export default function LockScreen({ locked, lockNonce = 0, prefs, verifyPin, biometricUnlock, onUnlocked }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [bioTried, setBioTried] = useState(false);
  const autoBioStarted = useRef(false);
  const hasPin = !!prefs?.pinHash;
  const biometricOn = !!prefs?.biometricLock;
  const pinLength = Number(prefs?.pinLength || 4);
  const title = useMemo(() => (biometricOn && !showPin ? 'Fingerprint Unlock' : 'Enter PIN'), [biometricOn, showPin]);

  useEffect(() => {
    setPin('');
    setError('');
    setBusy(false);
    setShowPin(false);
    setBioTried(false);
    autoBioStarted.current = false;
  }, [locked, lockNonce]);

  useEffect(() => {
    if (!locked || !biometricOn || showPin || autoBioStarted.current) return undefined;
    autoBioStarted.current = true;
    setBioTried(true);
    const timer = setTimeout(() => {
      if (document.visibilityState !== 'hidden') runBiometric(true);
    }, 450);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locked, lockNonce, biometricOn, showPin]);

  useEffect(() => {
    if (!locked || !hasPin || (!showPin && biometricOn) || busy) return;
    if (pin.length === pinLength) {
      const timer = setTimeout(() => submitPin(pin), 80);
      return () => clearTimeout(timer);
    }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin, locked, hasPin, showPin, pinLength, busy]);

  if (!locked) return null;

  async function submitPin(nextPin = pin) {
    if (!hasPin || nextPin.length !== pinLength || busy) return;
    setBusy(true);
    const ok = await verifyPin(nextPin);
    setBusy(false);
    if (ok) {
      onUnlocked();
      setPin('');
      setError('');
      return;
    }
    setError('Wrong PIN. Try again.');
    setPin('');
  }

  async function runBiometric(auto = false) {
    if (!biometricOn || busy) return;
    setBusy(true);
    setError('');
    const result = await biometricUnlock();
    setBusy(false);
    if (result?.ok) {
      onUnlocked();
      setError('');
      return;
    }
    setShowPin(true);
    setError(result?.reason || (auto ? 'Fingerprint failed. Enter PIN.' : 'Fingerprint cancelled. Enter PIN.'));
    setPin('');
  }

  function press(value) {
    if (value === 'del') {
      setPin((p) => p.slice(0, -1));
      return;
    }
    if (value === 'enter') {
      submitPin(pin);
      return;
    }
    setPin((p) => {
      const nextPin = (p + value).slice(0, pinLength);
      return nextPin;
    });
    setError('');
  }

  const pinVisible = !biometricOn || showPin;

  return (
    <div className="lock-screen full-lock-screen">
      <div className="lock-card full-lock-card">
        <div className="lock-icon"><i className={`ti ${biometricOn && !pinVisible ? 'ti-fingerprint' : 'ti-lock'}`} /></div>
        <h1>{title}</h1>
        <p>{biometricOn && !pinVisible ? 'Confirm fingerprint first. If it fails, use your PIN.' : 'Use your backup PIN/password to unlock CashNest X.'}</p>

        {error && <div className="pin-error lock-error">{error}</div>}

        {biometricOn && !pinVisible && (
          <div className="fingerprint-first-box">
            <button className="bio-primary-btn" type="button" disabled={busy} onClick={() => runBiometric(false)}>
              <i className={`ti ${busy ? 'ti-loader-2 spin' : 'ti-fingerprint'}`} />
              {busy ? 'Waiting for fingerprint…' : bioTried ? 'Scan Fingerprint Again' : 'Scan Fingerprint'}
            </button>
            {hasPin && <button className="bio-secondary-btn" type="button" onClick={() => setShowPin(true)}>Use PIN instead</button>}
          </div>
        )}

        {pinVisible && hasPin && (
          <>
            <div className="pin-dots pin-dots-big">{Array.from({ length: pinLength }).map((_, i) => <span key={i} className={pin.length > i ? 'filled' : ''} />)}</div>
            <div className="keypad full-keypad">
              {['1','2','3','4','5','6','7','8','9','del','0','enter'].map((key) => (
                <button key={key} type="button" className={key === 'enter' ? 'key-enter' : ''} onClick={() => press(key)} disabled={busy && key === 'enter'}>
                  {key === 'del' ? <i className="ti ti-backspace" /> : key === 'enter' ? <i className="ti ti-check" /> : key}
                </button>
              ))}
            </div>
            {biometricOn && <button className="bio-btn compact-bio-btn" type="button" disabled={busy} onClick={() => runBiometric(false)}><i className="ti ti-fingerprint" /> Try fingerprint again</button>}
          </>
        )}
      </div>
    </div>
  );
}
