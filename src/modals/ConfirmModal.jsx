import { createPortal } from 'react-dom';

export default function ConfirmModal({ open, title = 'Are you sure?', message = '', dangerLabel = 'Delete', cancelLabel = 'Cancel', icon = 'ti-alert-triangle', onCancel, onConfirm }) {
  if (!open) return null;

  const modal = (
    <div className="modal-overlay open confirm-overlay root-confirm-overlay" role="dialog" aria-modal="true" onClick={onCancel}>
      <div className="confirm-sheet root-confirm-sheet" onClick={(event) => event.stopPropagation()}>
        <div className="confirm-icon danger-soft"><i className={`ti ${icon}`} /></div>
        <h3>{title}</h3>
        <p>{message}</p>
        <div className="confirm-actions">
          <button className="ghost-btn" type="button" onClick={onCancel}>{cancelLabel}</button>
          <button className="danger-btn" type="button" onClick={onConfirm}>{dangerLabel}</button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
