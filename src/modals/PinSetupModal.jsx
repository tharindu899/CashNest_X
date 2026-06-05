import { useEffect, useState } from 'react';
import ModalPortal from '../components/ModalPortal';
import ConfirmModal from './ConfirmModal';

export default function PinSetupModal({ open, close, hasPin, onSave, onRemove, reason = '' }) {
  const [confirmRemoveOpen, setConfirmRemoveOpen] = useState(false);
  const [step, setStep] = useState('length');
  const [pinLength, setPinLength] = useState(4);
  const [firstPin, setFirstPin] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStep('length');
    setPinLength(4);
    setFirstPin('');
    setPin('');
    setError('');
    setSaving(false);
    setConfirmRemoveOpen(false);
  }, [open]);

  if (!open) return null;

  function title() {
    if (step === 'length') return hasPin ? 'Change PIN' : 'Create PIN';
    if (step === 'confirm') return 'Confirm PIN';
    return `${pinLength}-Digit PIN`;
  }

  function subtitle() {
    if (reason && step === 'length') return reason;
    if (step === 'length') return 'Choose your PIN length first. Fingerprint lock will use this PIN if fingerprint fails.';
    if (step === 'confirm') return `Enter the same ${pinLength}-digit PIN again to confirm.`;
    return `Enter a ${pinLength}-digit PIN.`;
  }

  function chooseLength(length) {
    setPinLength(length);
    setPin('');
    setFirstPin('');
    setError('');
    setStep('create');
  }

  async function next() {
    if (saving || step === 'length') return;
    if (!new RegExp(`^\\d{${pinLength}}$`).test(pin)) {
      setError(`PIN must be exactly ${pinLength} numbers.`);
      return;
    }
    if (step === 'create') {
      setFirstPin(pin);
      setPin('');
      setError('');
      setStep('confirm');
      return;
    }
    if (pin !== firstPin) {
      setError('PIN does not match. Try again.');
      setPin('');
      setStep('create');
      setFirstPin('');
      return;
    }
    setSaving(true);
    await onSave(pin, pinLength);
    setSaving(false);
    close();
  }

  function press(value) {
    if (value === 'del') {
      setPin((p) => p.slice(0, -1));
      return;
    }
    if (value === 'enter') {
      next();
      return;
    }
    setPin((p) => (p + value).slice(0, pinLength));
    setError('');
  }

  const modal = (
    <div className="modal-overlay open pin-setup-overlay" role="dialog" aria-modal="true" onClick={close}>
      <div className="modal-sheet clean-form-sheet pin-setup-sheet" onClick={(event) => event.stopPropagation()}>
        <div className="modal-handle" />
        <div className="pin-setup-top">
          <button type="button" className="pin-close-btn" onClick={close}><i className="ti ti-x" /></button>
          <div>
            <div className="pin-setup-kicker">CashNest X Security</div>
            <h1>{title()}</h1>
          </div>
        </div>

        <div className="pin-setup-scroll">
          <div className="pin-setup-body">
            <div className="lock-icon pin-setup-icon"><i className="ti ti-lock-code" /></div>
            <p>{subtitle()}</p>

            {step === 'length' ? (
              <div className="pin-length-choices">
                <button type="button" className={pinLength === 4 ? 'active' : ''} onClick={() => chooseLength(4)}>
                  <strong>4</strong><span>Digit PIN</span>
                </button>
                <button type="button" className={pinLength === 8 ? 'active' : ''} onClick={() => chooseLength(8)}>
                  <strong>8</strong><span>Digit PIN</span>
                </button>
              </div>
            ) : (
              <>
                <div className="pin-dots pin-dots-big">{Array.from({ length: pinLength }).map((_, i) => <span key={i} className={pin.length > i ? 'filled' : ''} />)}</div>
                {error && <div className="pin-error">{error}</div>}
              </>
            )}
          </div>

          {step !== 'length' && (
            <div className="keypad setup-keypad">
              {['1','2','3','4','5','6','7','8','9','del','0','enter'].map((key) => (
                <button key={key} type="button" className={key === 'enter' ? 'key-enter' : ''} onClick={() => press(key)} disabled={saving && key === 'enter'}>
                  {key === 'del' ? <i className="ti ti-backspace" /> : key === 'enter' ? <i className="ti ti-check" /> : key}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="pin-setup-actions">
          {step !== 'length' && <button className="bio-secondary-btn" type="button" onClick={() => { setStep('length'); setPin(''); setFirstPin(''); setError(''); }}>Change PIN length</button>}
          {hasPin && (
            <button className="ghost-danger-btn" type="button" onClick={() => setConfirmRemoveOpen(true)}>
              <i className="ti ti-trash" /> Remove PIN and biometric lock
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <ModalPortal>{modal}</ModalPortal>
      <ConfirmModal
        open={confirmRemoveOpen}
        title="Remove app lock?"
        message="This removes the saved PIN and biometric lock from this device. You can set it again later."
        dangerLabel="Remove Lock"
        cancelLabel="Keep Lock"
        icon="ti-trash"
        onCancel={() => setConfirmRemoveOpen(false)}
        onConfirm={() => { onRemove?.(); setConfirmRemoveOpen(false); close?.(); }}
      />
    </>
  );
}
