import { useMemo, useState } from 'react';
import ConfirmModal from '../modals/ConfirmModal';


function NotificationRow({ item, tab, markRead, archiveNotification, unarchiveNotification, requestDelete }) {
  const [swiped, setSwiped] = useState(false);
  const [startX, setStartX] = useState(0);
  const archived = tab === 'archived';

  function onTouchStart(event) {
    setStartX(event.touches?.[0]?.clientX || 0);
  }

  function onTouchEnd(event) {
    const endX = event.changedTouches?.[0]?.clientX || startX;
    const delta = endX - startX;
    if (delta < -36) setSwiped(true);
    if (delta > 36) setSwiped(false);
  }

  function archiveClick(event) {
    event.stopPropagation();
    if (archived) unarchiveNotification?.(item.id);
    else archiveNotification?.(item.id);
    setSwiped(false);
  }

  function deleteClick(event) {
    event.stopPropagation();
    requestDelete?.(item, archived);
    setSwiped(false);
  }

  return (
    <div className={`notif-swipe-wrap ${swiped ? 'swiped' : ''}`} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <div className="notif-right-actions" onClick={(event) => event.stopPropagation()}>
        <button className="icon-only" aria-label={archived ? 'Unarchive notification' : 'Archive notification'} onClick={archiveClick}>
          <i className={`ti ${archived ? 'ti-archive-off' : 'ti-archive'}`} />
        </button>
        <button className="icon-only danger" aria-label="Delete notification" onClick={deleteClick}>
          <i className="ti ti-trash-x" />
        </button>
      </div>
      <div className={`notif-item compact no-left-icon ${item.read ? 'read' : ''}`} onClick={() => markRead?.(item.id)}>
        <div className="notif-info">
          <div className="notif-title-row">
            <div className="notif-title">{item.title}</div>
            <div className="notif-time">{item.time}</div>
          </div>
          <div className="notif-desc">{item.desc}</div>
        </div>
        {!item.read && tab === 'active' && <div className="notif-unread-mark" />}
      </div>
    </div>
  );
}

export default function NotificationPanel({ open, close, notifications = [], archivedNotifications = [], markAllRead, deleteReadNotifications, markRead, archiveNotification, unarchiveNotification, deleteNotification }) {
  const [tab, setTab] = useState('active');
  const [confirmAction, setConfirmAction] = useState(null);
  const list = tab === 'active' ? notifications : archivedNotifications;
  const unread = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);
  const readCount = useMemo(() => notifications.filter((n) => n.read).length, [notifications]);

  function requestDeleteNotification(item, archived) {
    setConfirmAction({
      type: 'single',
      id: item.id,
      archived,
      title: 'Delete this notification?',
      message: `This will permanently remove “${item.title || 'this notification'}” from CashNest X.`,
      label: 'Delete'
    });
  }

  function requestDeleteRead() {
    if (!readCount) return;
    setConfirmAction({
      type: 'read',
      title: 'Delete read notifications?',
      message: `This will permanently remove ${readCount} read notification${readCount === 1 ? '' : 's'} from your inbox. Unread notifications stay safe.`,
      label: 'Delete read'
    });
  }

  function confirmDelete() {
    if (!confirmAction) return;
    if (confirmAction.type === 'single') deleteNotification?.(confirmAction.id, confirmAction.archived);
    if (confirmAction.type === 'read') deleteReadNotifications?.();
    setConfirmAction(null);
  }

  return (
    <div className={`notif-panel ${open ? 'open' : ''}`}>
      <div className="notif-header">
        <i className="ti ti-arrow-left" style={{ fontSize: 20, cursor: 'pointer' }} onClick={close} />
        <h2>Notifications</h2>
        {tab === 'active' && (
          <div className="notif-header-actions">
            <button className="mark-read-btn" onClick={markAllRead}>Mark read</button>
            <button className="clear-notif-btn" onClick={requestDeleteRead} disabled={!readCount} aria-label="Delete read notifications" title="Delete read notifications">
              <i className="ti ti-trash-x" />
            </button>
          </div>
        )}
      </div>
      <div className="notif-tabs compact-tabs">
        <button className={tab === 'active' ? 'active' : ''} onClick={() => setTab('active')}>Inbox {unread ? `(${unread})` : ''}</button>
        <button className={tab === 'archived' ? 'active' : ''} onClick={() => setTab('archived')}>Archived</button>
      </div>
      <div className="notif-list">
        {!list.length ? <div className="empty-state" style={{ margin: 16 }}>{tab === 'active' ? 'No important notifications yet.' : 'No archived notifications.'}</div> : list.map((n) => (
          <NotificationRow
            key={n.id}
            item={n}
            tab={tab}
            markRead={markRead}
            archiveNotification={archiveNotification}
            unarchiveNotification={unarchiveNotification}
            requestDelete={requestDeleteNotification}
          />
        ))}
      </div>
      <ConfirmModal
        open={!!confirmAction}
        title={confirmAction?.title}
        message={confirmAction?.message}
        dangerLabel={confirmAction?.label || 'Delete'}
        cancelLabel="Keep"
        icon="ti-trash-x"
        onCancel={() => setConfirmAction(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
