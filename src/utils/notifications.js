import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { formatLoanReminderTime, getLoanReminderDate } from './loanReminder';

const COLOR_MAP = {
  accent: '#4f8ef7',
  green: '#30d48a',
  red: '#f05c6e',
  amber: '#f5a623',
  purple: '#a78bfa',
  teal: '#2dd4bf',
  pink: '#f472b6'
};

const TYPE_ICON = {
  income: 'ti-trending-up',
  expense: 'ti-receipt',
  transfer: 'ti-arrows-exchange',
  loan: 'ti-clock-dollar',
  loanDue: 'ti-bell-ringing',
  budget: 'ti-target-arrow',
  account: 'ti-wallet',
  scan: 'ti-photo-scan',
  delete: 'ti-trash',
  success: 'ti-circle-check',
  alert: 'ti-bell-ringing',
  export: 'ti-database-export',
  release: 'ti-download'
};

export const NOTIFICATION_ACTION_TYPE_ID = 'cashnest_x_notification_actions';
export const NOTIFICATION_ACTION_MARK_READ = 'mark-read';
export const NOTIFICATION_ACTION_OPEN = 'open-app';
export const NOTIFICATION_ACTION_DELETE = 'delete-notification';

let nativeActionsRegistered = false;
let nativeActionListenerHandle = null;

export async function registerMobileNotificationActions({ onMarkRead, onDelete, onOpen } = {}) {
  if (!Capacitor.isNativePlatform()) return null;
  const hasCallbacks = !!(onMarkRead || onDelete || onOpen);
  try {
    if (!nativeActionsRegistered) {
      await LocalNotifications.registerActionTypes({
        types: [{
          id: NOTIFICATION_ACTION_TYPE_ID,
          actions: [
            { id: NOTIFICATION_ACTION_MARK_READ, title: 'Mark read' },
            { id: NOTIFICATION_ACTION_DELETE, title: 'Delete', destructive: true },
            { id: NOTIFICATION_ACTION_OPEN, title: 'Open' }
          ]
        }]
      });
      nativeActionsRegistered = true;
    }

    if (!hasCallbacks) return nativeActionListenerHandle;

    if (nativeActionListenerHandle) {
      await nativeActionListenerHandle.remove();
      nativeActionListenerHandle = null;
    }

    nativeActionListenerHandle = await LocalNotifications.addListener('localNotificationActionPerformed', (event) => {
      const actionId = event?.actionId || '';
      const notification = event?.notification || {};
      if (actionId === NOTIFICATION_ACTION_MARK_READ) {
        onMarkRead?.(notification?.extra || {}, notification);
        return;
      }
      if (actionId === NOTIFICATION_ACTION_DELETE) {
        onDelete?.(notification?.extra || {}, notification);
        return;
      }
      onOpen?.(notification?.extra || {}, notification);
    });
    return nativeActionListenerHandle;
  } catch (error) {
    console.warn('Native notification actions failed:', error);
    return null;
  }
}

export async function clearDeliveredMobileNotification(notificationId) {
  if (!Capacitor.isNativePlatform() || !notificationId) return;
  try {
    await LocalNotifications.removeDeliveredNotifications({
      notifications: [{ id: Number(notificationId) }]
    });
  } catch (error) {
    try {
      await LocalNotifications.cancel({ notifications: [{ id: Number(notificationId) }] });
    } catch (cancelError) {
      console.warn('Could not clear mobile notification:', cancelError);
    }
  }
}

export function createNotification({ title, desc, icon = 'ti-bell', color = 'accent', type = 'success', action = '' }) {
  return {
    id: `noti-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title,
    desc,
    icon,
    color,
    type,
    action,
    read: false,
    archived: false,
    createdAt: Date.now(),
    time: new Date().toLocaleString('en-LK', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  };
}

function svgNotificationIcon(type = 'success', color = 'accent') {
  const bg = COLOR_MAP[color] || COLOR_MAP.accent;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="192" height="192" viewBox="0 0 192 192"><rect x="18" y="18" width="156" height="156" rx="42" fill="${bg}"/><path d="M56 54h68a17 17 0 0 1 17 17v8H58a12 12 0 0 1-2-25Z" fill="#fff" opacity=".94"/><path d="M42 74h96a18 18 0 0 1 18 18v43a14 14 0 0 1-14 14H55a18 18 0 0 1-18-18V86a12 12 0 0 1 5-12Z" fill="#fff"/><path d="M111 98h45v32h-45a16 16 0 0 1 0-32Z" fill="#111827"/><circle cx="124" cy="114" r="8" fill="#2dd4bf"/><path d="M61 109c11 12 27 13 40 3" fill="none" stroke="#4f8ef7" stroke-width="8" stroke-linecap="round"/><path d="M66 124c10 8 23 8 34 1" fill="none" stroke="#2dd4bf" stroke-width="7" stroke-linecap="round"/></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export async function requestBrowserNotificationPermission() {
  if (!('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'default') {
    return Notification.requestPermission();
  }
  return Notification.permission;
}

export async function requestNativeNotificationPermission() {
  if (!Capacitor.isNativePlatform()) return 'web';
  try {
    const current = await LocalNotifications.checkPermissions();
    if (current.display === 'granted') return 'granted';
    const next = await LocalNotifications.requestPermissions();
    return next.display;
  } catch (error) {
    console.warn('Native notification permission failed:', error);
    return 'denied';
  }
}

export async function showMobileNotification(enabled, title, body, options = {}) {
  if (!enabled) return;
  const color = options.color || 'accent';
  const type = options.type || 'success';

  if (Capacitor.isNativePlatform()) {
    try {
      const permission = await requestNativeNotificationPermission();
      if (permission !== 'granted') return;
      await registerMobileNotificationActions();
      const mobileId = Number(options.mobileId || String(Date.now()).slice(-8));
      const notification = {
        id: mobileId,
        title,
        body,
        largeBody: body,
        summaryText: options.summary || 'CashNest X update',
        smallIcon: 'ic_stat_cashnest_x_notification',
        largeIcon: 'ic_cashnest_x_notification_large',
        iconColor: COLOR_MAP[color] || COLOR_MAP.accent,
        actionTypeId: NOTIFICATION_ACTION_TYPE_ID,
        attachments: options.attachment ? [{ id: 'receipt', url: options.attachment }] : undefined,
        extra: {
          screen: options.screen || 'home',
          type,
          appNotificationId: options.appNotificationId || '',
          tag: options.tag || `cashnest_x-${type}`,
          mobileId,
          fileUri: options.fileUri || '',
          filePath: options.filePath || '',
          fileName: options.fileName || '',
          mimeType: options.mimeType || ''
        }
      };

      // Do not schedule normal app notifications a few milliseconds in the future.
      // On Android, near-future schedules can be delayed by Doze / exact-alarm rules.
      // Leaving `schedule` empty makes LocalNotifications post immediately.
      if (options.at instanceof Date && options.at.getTime() > Date.now() + 1500) {
        notification.schedule = { at: options.at };
      }

      await LocalNotifications.schedule({ notifications: [notification] });
      return;
    } catch (error) {
      console.warn('Native notification failed, using web fallback:', error);
    }
  }

  if (!('Notification' in window)) return;
  const permission = await requestBrowserNotificationPermission();
  if (permission !== 'granted') return;
  try {
    new Notification(title, {
      body,
      tag: options.tag || `cashnest_x-${type}`,
      silent: false,
      icon: svgNotificationIcon(type, color),
      badge: svgNotificationIcon(type, color)
    });
  } catch (error) {
    console.warn('Browser notification failed:', error);
  }
}


function stableLoanNotificationId(loanId) {
  const raw = String(loanId || 'loan');
  let hash = 0;
  for (let index = 0; index < raw.length; index += 1) {
    hash = ((hash << 5) - hash + raw.charCodeAt(index)) | 0;
  }
  return 70000000 + Math.abs(hash % 9999999);
}

export async function cancelLoanReminder(loanId) {
  if (!loanId || !Capacitor.isNativePlatform()) return;
  try {
    await LocalNotifications.cancel({ notifications: [{ id: stableLoanNotificationId(loanId) }] });
  } catch (error) {
    console.warn('Could not cancel old loan reminder:', error);
  }
}

export async function scheduleLoanReminder(enabled, loan) {
  if (!loan?.id) return;
  await cancelLoanReminder(loan.id);
  if (!enabled || !loan?.dueDateValue || loan.status === 'paid') return;
  const due = getLoanReminderDate(loan);
  if (!due) return;
  const notifyAt = due.getTime() > Date.now() + 60000 ? due : new Date(Date.now() + 60000);
  const remaining = Math.max(0, Number(loan.amount || 0) - Number(loan.paid || 0));
  const direction = loan.type === 'Borrowing' ? 'You owe' : 'Collect from';
  await showMobileNotification(true, 'Loan reminder', `${direction} ${loan.person}: Rs. ${remaining.toLocaleString('en-LK')} due ${loan.due || loan.dueDateValue} at ${formatLoanReminderTime(loan.reminderTime)}.`, {
    type: 'loanDue',
    color: loan.type === 'Borrowing' ? 'red' : 'green',
    summary: 'CashNest X loan reminder',
    screen: 'records',
    at: notifyAt,
    tag: `loan-${loan.id}`,
    mobileId: stableLoanNotificationId(loan.id)
  });
}

export const showBrowserNotification = showMobileNotification;
