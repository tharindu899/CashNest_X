import { useState } from 'react';
import ModalPortal from '../components/ModalPortal';

const exportOptions = [
  {
    type: 'csv',
    title: 'CSV Transactions',
    extension: '.csv',
    subtitle: 'Beautiful transaction table with clean columns and sample row if empty.',
    icon: 'ti-file-type-csv',
    color: 'teal'
  },
  {
    type: 'xls',
    title: 'Excel File',
    extension: '.xls',
    subtitle: 'Styled workbook with summary cards, examples, accounts, transactions, loans and budgets.',
    icon: 'ti-file-spreadsheet',
    color: 'green'
  },
  {
    type: 'json',
    title: 'JSON Backup',
    extension: '.json',
    subtitle: 'Full backup plus export guide examples for every file type.',
    icon: 'ti-json',
    color: 'amber'
  },

  {
    type: 'md',
    title: 'Markdown Report',
    extension: '.md',
    subtitle: 'Beautiful GitHub-style report with tables and file examples.',
    icon: 'ti-markdown',
    color: 'accent'
  },
  {
    type: 'pdf',
    title: 'PDF Report',
    extension: '.pdf',
    subtitle: 'Printable report with summary, examples and important records.',
    icon: 'ti-file-type-pdf',
    color: 'red'
  }
];

export default function ExportDataModal({ open, close, onExport }) {
  const [busyType, setBusyType] = useState('');
  const [error, setError] = useState('');


  if (!open) return null;

  function resetAndClose() {
    setBusyType('');
    setError('');
    close();
  }

  async function handleExport(type) {
    setBusyType(type);
    setError('');
    try {
      await onExport(type);
      setBusyType('');
      setError('');
      close();
    } catch (exportError) {
      setError(exportError?.message || 'Export failed. Please try again.');
    } finally {
      setBusyType('');
    }
  }

  const exportBusy = !!busyType;

  const modal = (
    <div className="modal-overlay open export-overlay" role="dialog" aria-modal="true" onClick={resetAndClose}>
      <div className="modal-sheet clean-form-sheet export-sheet" onClick={(event) => event.stopPropagation()}>
        <div className="modal-handle" />
        <div className="modal-title">Export Data</div>
        <div className="export-hero">
          <div className="export-hero-icon"><i className="ti ti-database-export" /></div>
          <div>
            <div className="export-hero-title">Download your CashNest X data</div>
            <div className="export-hero-sub">Beautiful files are saved inside your phone at Documents/CashNest X.</div>
          </div>
        </div>

        {error ? (
          <div className="export-result-card error">
            <div className="export-result-icon"><i className="ti ti-alert-circle" /></div>
            <div className="export-result-title">Export failed</div>
            <div className="export-result-sub">{error}</div>
          </div>
        ) : null}

        <div className="export-list">
          {exportOptions.map((option) => (
            <button type="button" className="export-option" key={option.type} onClick={() => handleExport(option.type)} disabled={exportBusy}>
              <span className="export-option-icon" style={{ background: `color-mix(in srgb, var(--${option.color}) 14%, transparent)`, color: `var(--${option.color})` }}><i className={`ti ${option.icon}`} /></span>
              <span className="export-option-text">
                <b>{option.title} <em>{option.extension}</em></b>
                <small>{option.subtitle}</small>
              </span>
              {busyType === option.type ? <i className="ti ti-loader-2 export-spin" /> : <i className="ti ti-download export-option-arrow" />}
            </button>
          ))}
        </div>

        <div className="export-help-card">
          <i className="ti ti-info-circle" />
          <span>Each export includes clean formatting and examples of what is inside. Files are saved in Documents/CashNest X.</span>
        </div>
        <div className="export-footer">
          <button className="secondary-btn export-cancel-btn" type="button" onClick={resetAndClose} disabled={exportBusy}>{busyType ? `Saving ${exportOptions.find((option) => option.type === busyType)?.title || 'file'}...` : 'Cancel'}</button>
        </div>
      </div>
    </div>
  );

  return <ModalPortal>{modal}</ModalPortal>;
}
