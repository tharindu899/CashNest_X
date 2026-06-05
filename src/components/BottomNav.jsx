import { startTransition, useRef, useState } from 'react';

const navItems = [
  ['home', 'ti-home-2', 'Home'],
  ['analytics', 'ti-chart-pie', 'Analytics'],
  ['records', 'ti-list-search', 'Records'],
  ['settings', 'ti-settings-2', 'Settings']
];

export default function BottomNav({ activeTab, setActiveTab, openAdd, openQuickAdd }) {
  const [quickOpen, setQuickOpen] = useState(false);
  const pressTimer = useRef(null);

  function startPress() {
    clearTimeout(pressTimer.current);
    pressTimer.current = setTimeout(() => setQuickOpen(true), 420);
  }

  function endPress() {
    clearTimeout(pressTimer.current);
  }

  function changeTab(id) {
    if (id === activeTab) return;
    startTransition(() => setActiveTab(id));
  }

  function runQuick(type) {
    setQuickOpen(false);
    requestAnimationFrame(() => openQuickAdd?.(type));
  }

  return (
    <>
      {quickOpen && <div className="quick-add-backdrop" onClick={() => setQuickOpen(false)} />}
      <div className={`quick-add-pop ${quickOpen ? 'open' : ''}`}>
        <button type="button" onClick={() => runQuick('expense')}><i className="ti ti-arrow-up-right" /> Expense</button>
        <button type="button" onClick={() => runQuick('income')}><i className="ti ti-arrow-down-left" /> Income</button>
        <button type="button" onClick={() => runQuick('transfer')}><i className="ti ti-arrows-exchange" /> Transfer</button>
        <button type="button" onClick={() => runQuick('scan')}><i className="ti ti-camera" /> Scan</button>
      </div>
      <div className="bottom-nav">
        <svg className="nav-divider-arc" aria-hidden="true" viewBox="0 0 1000 10" preserveAspectRatio="none" focusable="false">
          <path className="nav-divider-fill" d="M442 10 C456 4 478 2 500 2 C522 2 544 4 558 10 L442 10 Z" />
          <path className="nav-divider-line" d="M0 10 H442 C456 4 478 2 500 2 C522 2 544 4 558 10 H1000" vectorEffect="non-scaling-stroke" />
        </svg>
        {navItems.slice(0, 2).map(([id, icon, label]) => (
          <button key={id} type="button" className={`nav-btn ${activeTab === id ? 'active' : ''}`} onClick={() => changeTab(id)} aria-label={label}>
            <i className={`ti ${icon}`} /><span className="nav-lbl">{label}</span>
          </button>
        ))}
        <div className="nav-plus-wrap">
          <button
            type="button"
            className="nav-plus nav-plus-circle"
            style={{
              width: '58px',
              height: '58px',
              minWidth: '58px',
              maxWidth: '58px',
              minHeight: '58px',
              maxHeight: '58px',
              aspectRatio: '1 / 1',
              borderRadius: '9999px',
              padding: 0,
              flex: '0 0 58px'
            }}
            onClick={() => (quickOpen ? setQuickOpen(false) : openAdd?.())}
            onPointerDown={startPress}
            onPointerUp={endPress}
            onPointerCancel={endPress}
            onContextMenu={(event) => { event.preventDefault(); setQuickOpen(true); }}
            title="Tap to add, long press for quick add"
            aria-label="Add transaction"
          >
            <i className="ti ti-plus" />
          </button>
        </div>
        {navItems.slice(2).map(([id, icon, label]) => (
          <button key={id} type="button" className={`nav-btn ${activeTab === id ? 'active' : ''}`} onClick={() => changeTab(id)} aria-label={label}>
            <i className={`ti ${icon}`} /><span className="nav-lbl">{label}</span>
          </button>
        ))}
      </div>
    </>
  );
}
