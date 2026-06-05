function HeaderAvatar({ signedIn = false, googleUser = {} }) {
  const imageUrl = googleUser?.imageUrl || googleUser?.picture || '';
  return (
    <div className={`avatar-btn ${imageUrl ? 'has-photo' : ''}`} aria-label={signedIn ? 'Google profile' : 'Guest profile'}>
      {signedIn && imageUrl ? (
        <img src={imageUrl} alt="Google profile" referrerPolicy="no-referrer" />
      ) : (
        <i className={`ti ${signedIn ? 'ti-user-circle' : 'ti-user'}`} />
      )}
    </div>
  );
}

export default function Header({ title = 'CashNest X', subtitle, onNotifications, unread = 0, signedIn = false, googleUser = {} }) {
  return (
    <div className="screen-header">
      <div>
        {subtitle && <div style={{ fontSize: 12, color: 'var(--text3)' }}>{subtitle}</div>}
        <div className="screen-title">{title}</div>
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        {onNotifications && (
          <div className="icon-btn rel-wrap" onClick={onNotifications}>
            <i className="ti ti-bell" />
            <span className={`notif-badge ${unread ? '' : 'hide'}`}>{unread}</span>
          </div>
        )}
        <HeaderAvatar signedIn={signedIn} googleUser={googleUser} />
      </div>
    </div>
  );
}
