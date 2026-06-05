import CurrencyRatesPanel from '../components/CurrencyRatesPanel';
import ModalPortal from '../components/ModalPortal';

export default function EditCurrencyModal({ open, close, appCurrency = 'LKR', rateInfo, conversionRates }) {
  if (!open) return null;

  const modal = (
    <div className="modal-overlay currency-edit-overlay open" onClick={close}>
      <div className="modal-sheet edit-currency-sheet" onClick={(event) => event.stopPropagation()}>
        <div className="modal-handle" />
        <div className="modal-title">Edit Currency</div>
        <div className="edit-currency-scroll">
          <CurrencyRatesPanel
            appCurrency={appCurrency}
            rateInfo={rateInfo || { rates: conversionRates }}
            onRefresh={rateInfo?.refreshRates}
            onEditRate={rateInfo?.setManualRate}
            onResetRate={rateInfo?.resetManualRate}
            inModal
          />
        </div>
        <div className="edit-currency-footer">
          <button className="modal-close-btn" type="button" onClick={close}>Done</button>
        </div>
      </div>
    </div>
  );

  return <ModalPortal>{modal}</ModalPortal>;
}
