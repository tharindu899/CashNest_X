import { useRef } from 'react';
import { colorVar } from '../models/categories';
import { formatMoneyForCurrency } from '../utils/currency';

const LONG_TAP_MS = 560;

export default function AccountPills({ accounts, filter, setFilter, openAccount, openAccountDetails }) {
  const longTapTimer = useRef(null);
  const longTapOpened = useRef(false);

  function clearLongTap() {
    if (longTapTimer.current) clearTimeout(longTapTimer.current);
    longTapTimer.current = null;
  }

  function startLongTap(account) {
    clearLongTap();
    longTapOpened.current = false;
    longTapTimer.current = setTimeout(() => {
      longTapOpened.current = true;
      openAccountDetails?.(account);
    }, LONG_TAP_MS);
  }

  function handleAccountTap(account) {
    clearLongTap();
    if (longTapOpened.current) {
      longTapOpened.current = false;
      return;
    }
    setFilter(account.id);
  }

  function openAccountMenu(event, account) {
    event.preventDefault();
    clearLongTap();
    longTapOpened.current = true;
    openAccountDetails?.(account);
  }

  return (
    <>
      <div className="section-label">Accounts</div>
      <div className="account-scroll">
        <div className={`acc-pill ${filter === 'All' ? 'active' : ''}`} onClick={() => setFilter('All')}>
          <div className="acc-dot" style={{ background: '#4f8ef7' }} /><span className="acc-name">All</span>
        </div>
        {accounts.map((account) => (
          <div
            key={account.id}
            className={`acc-pill ${filter === account.id ? 'active' : ''} ${account.hideFromTotal ? 'hidden-total' : ''}`}
            onPointerDown={() => startLongTap(account)}
            onPointerUp={() => clearLongTap()}
            onPointerLeave={() => clearLongTap()}
            onPointerCancel={() => clearLongTap()}
            onClick={() => handleAccountTap(account)}
            onContextMenu={(event) => openAccountMenu(event, account)}
            title="Long tap to edit"
          >
            <div className="acc-dot" style={{ background: colorVar(account.color) }} />
            <span className="acc-name">{account.name.replace(' Wallet', '')}</span>
            {account.hideFromTotal ? (
              <span className="acc-bal acc-bal-hidden"><i className="ti ti-eye-off acc-hidden-icon" title="Hidden from total balance" /> Hidden</span>
            ) : (
              <span className="acc-bal">{formatMoneyForCurrency(account.balance, account.currency, { short: true })}</span>
            )}
          </div>
        ))}
        <div className="acc-pill" style={{ borderStyle: 'dashed' }} onClick={openAccount}>
          <i className="ti ti-plus" style={{ fontSize: 14, color: 'var(--text3)' }} /><span className="acc-name">Add</span>
        </div>
      </div>
    </>
  );
}
