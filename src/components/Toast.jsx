export default function Toast({ toast }) {
  return (
    <div className={`toast ${toast ? 'show' : ''}`}>
      <i className={`ti ${toast?.icon || 'ti-check'}`} />
      <span id="toastText">{toast?.message || ''}</span>
    </div>
  );
}
