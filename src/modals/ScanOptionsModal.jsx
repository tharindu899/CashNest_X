export default function ScanOptionsModal({ open, close, onPhoto, onConvert }) {
  if (!open) return null;
  return (
    <div className="modal-overlay open" onClick={close}>
      <div className="modal-sheet scan-options-sheet compact" onClick={(event) => event.stopPropagation()}>
        <div className="modal-handle" />
        <div className="modal-title">More Actions</div>
        <button className="more-action-quick" onClick={() => { close(); onConvert?.(); }}>
          <span className="quick-icon more-action-icon convert"><i className="ti ti-arrows-exchange-2" /></span>
          <span>
            <b>Currency Converter</b>
            <small>Convert LKR, USD, EUR, GBP, INR and AED quickly</small>
          </span>
          <i className="ti ti-chevron-right scan-photo-arrow" />
        </button>
        <button className="more-action-quick" onClick={() => { close(); onPhoto?.(); }}>
          <span className="quick-icon more-action-icon photo"><i className="ti ti-photo" /></span>
          <span>
            <b>Pick Receipt Photo</b>
            <small>Choose saved receipt image and autofill expense details</small>
          </span>
          <i className="ti ti-chevron-right scan-photo-arrow" />
        </button>
        <button className="secondary-btn" onClick={close}>Cancel</button>
      </div>
    </div>
  );
}
