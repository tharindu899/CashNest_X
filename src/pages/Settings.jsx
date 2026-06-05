import { useEffect, useRef, useState } from 'react';
import OptionPickerModal from '../modals/OptionPickerModal';
import PinSetupModal from '../modals/PinSetupModal';
import ExportDataModal from '../modals/ExportDataModal';
import ConfirmModal from '../modals/ConfirmModal';
import CategorySettingModal from '../modals/CategorySettingModal';
import { currencies, getCurrencyByCode } from '../models/currencies';
import { APP_VERSION, checkLatestRelease } from '../utils/updater';
import EditCurrencyModal from '../modals/EditCurrencyModal';
import HiddenAccountBadge from '../components/HiddenAccountBadge';
import { describeBackupTime } from '../utils/googleBackupMeta';
import { describeLocalBackupTime } from '../utils/localBackup';
import { accentThemes, getAccentTheme } from '../utils/themeAccent';
import { APP_NAME, GOOGLE_BACKUP_ENABLED, GOOGLE_DISABLED_MESSAGE } from '../config/appConfig';
import { getCloudflareBackupStatus } from '../services/cloudBackup';

export default function Settings({ ledger, openCategory, openAccountDetails, openUpdater, conversionRates, rateInfo }) {
  const isLight = ledger.state.theme === 'light';
  const prefs = ledger.state.preferences || {};
  const notificationsOn = prefs.notifications !== false;
  const soundsOn = prefs.transactionSounds !== false;
  const biometricOn = !!prefs.biometricLock;
  const pinOn = !!prefs.pinHash;
  const compactNumbersOn = !!prefs.compactNumbers;
  const autoBackupOn = GOOGLE_BACKUP_ENABLED && prefs.autoGoogleBackup === true;
  const autoLocalBackupOn = prefs.autoLocalBackup === true;
  const [picker, setPicker] = useState(null);
  const [pinOpen, setPinOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [editCurrencyOpen, setEditCurrencyOpen] = useState(false);
  const [categorySettingOpen, setCategorySettingOpen] = useState(false);
  const [signOutConfirmOpen, setSignOutConfirmOpen] = useState(false);
  const [restoreConfirmOpen, setRestoreConfirmOpen] = useState(false);
  const [cloudRestoreConfirm, setCloudRestoreConfirm] = useState(null);
  const [localFileRestoreConfirmOpen, setLocalFileRestoreConfirmOpen] = useState(false);
  const [pendingLocalRestoreFile, setPendingLocalRestoreFile] = useState(null);
  const localRestoreInputRef = useRef(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [pinReason, setPinReason] = useState('');
  const [enableBioAfterPin, setEnableBioAfterPin] = useState(false);
  const [githubUpdate, setGithubUpdate] = useState({ status: 'idle', latestVersion: '', hasUpdate: false, error: '' });
  const currentCurrency = getCurrencyByCode(ledger.state.currency || 'LKR');
  const currentAccent = getAccentTheme(ledger.state.accentColor || 'blue');
  const googleUser = ledger.state.googleUser || {};
  const backup = ledger.state.googleBackup || {};
  const localBackup = ledger.state.localBackup || {};
  const cloudBackups = ledger.state.cloudBackups || {};
  const cloudflareInfo = getCloudflareBackupStatus();
  const cloudflareBackup = cloudBackups.cloudflare || {};
  const selectedCloudBackupProvider = 'cloudflare';
  const cloudflareCloudSelected = true;
  const autoCloudBackupOn = autoBackupOn;
  const autoCloudflareBackupOn = autoBackupOn;
  const showCloudflareRows = true;
  const isBackingUp = backup.status === 'uploading';
  const isRestoring = backup.status === 'restoring';
  const isLocalBackupSaving = localBackup.status === 'saving';
  const isLocalBackupRestoring = localBackup.status === 'restoring';
  const isCloudflareBackingUp = cloudflareBackup.status === 'uploading';
  const isCloudflareRestoring = cloudflareBackup.status === 'restoring';
  const lastBackupText = describeBackupTime(backup.lastBackupAt || backup.modifiedTime);
  const lastAutoLocalBackupText = describeLocalBackupTime(localBackup.lastAutoBackupAt);
  const lastManualLocalBackupText = describeLocalBackupTime(localBackup.lastManualBackupAt);
  const lastLocalRestoreText = describeLocalBackupTime(localBackup.lastRestoreAt);
  const currencyOptions = currencies.map((currency) => ({
    value: currency.code,
    label: `${currency.code} — ${currency.label}`,
    subtitle: `Example: ${currency.symbol} 1,000`,
    iconText: currency.symbol,
    color: 'amber'
  }));

  useEffect(() => {
    let mounted = true;
    setGithubUpdate((prev) => ({ ...prev, status: 'checking', error: '' }));
    checkLatestRelease()
      .then((update) => {
        if (!mounted) return;
        setGithubUpdate({
          status: 'ready',
          latestVersion: update?.latestVersion || '',
          hasUpdate: !!update?.hasUpdate,
          error: update?.hasUpdate && !update?.asset ? 'APK missing in latest GitHub release' : ''
        });
      })
      .catch((error) => {
        if (!mounted) return;
        setGithubUpdate({
          status: 'error',
          latestVersion: '',
          hasUpdate: false,
          error: error?.message || 'GitHub update check failed'
        });
      });
    return () => { mounted = false; };
  }, []);

  function getUpdaterSubtitle() {
    if (githubUpdate.status === 'checking') return `Installed v${APP_VERSION} • checking GitHub release…`;
    if (githubUpdate.status === 'ready' && githubUpdate.hasUpdate) return `New v${githubUpdate.latestVersion} available • tap to update`;
    if (githubUpdate.status === 'ready') return `Installed v${APP_VERSION} • latest v${githubUpdate.latestVersion || APP_VERSION}`;
    if (githubUpdate.status === 'error') return `Installed v${APP_VERSION} • ${githubUpdate.error}`;
    return `Installed v${APP_VERSION} • check GitHub release`;
  }


  function getLocalAutoBackupSubtitle() {
    if (autoLocalBackupOn) return `On • Documents/CashNest X • encrypted • replaces existing • latest ${lastAutoLocalBackupText}`;
    return `Off • manual backup only • latest ${lastAutoLocalBackupText}`;
  }

  function getLocalManualBackupSubtitle() {
    if (isLocalBackupSaving) return 'Encrypting backup to phone…';
    return `Save encrypted backup to Documents/CashNest X • replaces existing • last ${lastManualLocalBackupText}`;
  }

  function getLocalRestoreSubtitle() {
    if (isLocalBackupRestoring) return 'Restoring encrypted backup…';
    if (localBackup.error) return localBackup.error;
    return `Choose encrypted backup file from Documents/CashNest X • last restored ${lastLocalRestoreText}`;
  }

  function getCloudBackupSubtitle(info, item, saving) {
    if (saving) return 'Encrypting and uploading cloud backup…';
    if (item?.error) return item.error;
    if (!info.configured) return `Developer setup needed • ${info.missing.join(', ')}`;
    return `Ready • encrypted backup • last ${describeLocalBackupTime(item?.lastBackupAt)}`;
  }

  function getCloudRestoreSubtitle(info, item, restoring) {
    if (restoring) return 'Downloading and restoring encrypted cloud backup…';
    if (item?.error) return item.error;
    if (!info.configured) return `Developer setup needed • ${info.missing.join(', ')}`;
    return `Confirm first • replaces local data • last restored ${describeLocalBackupTime(item?.lastRestoreAt)}`;
  }

  function getCloudMethodSubtitle(provider, info) {
    const isSelected = selectedCloudBackupProvider === provider;
    if (isSelected) return 'Selected • Firebase user sync • manual backup/restore available';
    if (!info.configured) return `Developer setup needed • ${info.missing.join(', ')}`;
    return 'Ready • Cloudflare KV is the only cloud backup method';
  }

  function getAutoCloudBackupSubtitle(provider, info, item) {
    const enabled = autoCloudBackupOn && selectedCloudBackupProvider === provider;
    if (!info.configured) return `Off • developer setup needed • ${info.missing.join(', ')}`;
    if (enabled) return `On • encrypted backup after app changes • last ${describeLocalBackupTime(item?.lastBackupAt)}`;
    return 'Off • automatic backup is optional • manual backup still available';
  }

  function getCloudProviderLabel(provider) {
    return 'Cloudflare KV';
  }

  async function confirmCloudRestore() {
    const provider = cloudRestoreConfirm;
    setCloudRestoreConfirm(null);
    await ledger.restoreFromCloudflareBackup();
  }

  function handleLocalRestoreFileChange(event) {
    const file = event.target.files?.[0] || null;
    event.target.value = '';
    if (!file) return;
    setPendingLocalRestoreFile(file);
    setLocalFileRestoreConfirmOpen(true);
  }

  async function confirmLocalFileRestore() {
    const file = pendingLocalRestoreFile;
    setLocalFileRestoreConfirmOpen(false);
    setPendingLocalRestoreFile(null);
    if (file) await ledger.restoreFromLocalBackupFile(file);
  }

  function getUpdaterIcon() {
    if (githubUpdate.status === 'checking') return 'ti-loader-2 spin';
    if (githubUpdate.status === 'ready' && githubUpdate.hasUpdate) return 'ti-download';
    if (githubUpdate.status === 'error') return 'ti-alert-circle';
    return 'ti-refresh';
  }

  function openPinSetup(reason = '', enableBio = false) {
    setPinReason(reason);
    setEnableBioAfterPin(enableBio);
    setPinOpen(true);
  }

  async function savePin(pin, pinLength) {
    await ledger.setPinLock(pin, pinLength);
    if (enableBioAfterPin) {
      await ledger.toggleBiometricLock();
      setEnableBioAfterPin(false);
      setPinReason('');
    }
  }

  function handleGoogleAccountClick() {
    if (!GOOGLE_BACKUP_ENABLED) {
      ledger.showGoogleDeveloperMessage?.();
      return;
    }
    if (ledger.state.signedIn) {
      setSignOutConfirmOpen(true);
      return;
    }
    ledger.loginWithGoogle();
  }

  async function confirmGoogleSignOut() {
    setSignOutConfirmOpen(false);
    await ledger.logoutGoogle();
  }

  async function confirmGoogleRestore() {
    setRestoreConfirmOpen(false);
    await ledger.restoreFromFirebaseKv();
  }

  function requestDeleteCategory(categoryName) {
    setDeleteConfirm({
      title: 'Delete category?',
      message: `This will permanently delete “${categoryName}” from custom categories. Existing transactions stay safe.`,
      label: 'Delete Category',
      onConfirm: () => ledger.deleteCategory(categoryName)
    });
  }

  function requestResetAll() {
    setDeleteConfirm({
      title: 'Reset all local data?',
      message: 'This deletes local accounts, transactions, loans, budgets, settings and categories from this device. cloud/local backups are not deleted.',
      label: 'Reset All Data',
      onConfirm: () => ledger.resetAll()
    });
  }

  function confirmDeleteAction() {
    deleteConfirm?.onConfirm?.();
    setDeleteConfirm(null);
  }


  function openExternalLink(url) {
    try {
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      navigator.clipboard?.writeText?.(url);
    }
  }

  function renderSpinnerOrIcon(isBusy, icon) {
    return <i className={`ti ${isBusy ? 'ti-loader-2 spin' : icon}`} />;
  }

  async function handleBiometricClick() {
    if (biometricOn) {
      await ledger.toggleBiometricLock();
      return;
    }
    if (!pinOn) {
      openPinSetup('Create a PIN first. Fingerprint uses this PIN as the fallback when scan fails.', true);
      return;
    }
    await ledger.toggleBiometricLock();
  }

  return (
    <div className="screen active">
      <div className="screen-header"><div className="screen-title">Settings</div></div>
      <div className="scroll-area">
        <div className="profile-banner">
          <div className="profile-avatar">{GOOGLE_BACKUP_ENABLED && ledger.state.signedIn && googleUser.imageUrl ? <img src={googleUser.imageUrl} alt="Google profile" referrerPolicy="no-referrer" /> : <i className={`ti ${GOOGLE_BACKUP_ENABLED && ledger.state.signedIn ? 'ti-user-circle' : 'ti-shield-lock'}`} />}</div>
          <div>
            <div className="profile-name">{GOOGLE_BACKUP_ENABLED && ledger.state.signedIn ? (googleUser.name || 'Google User') : APP_NAME}</div>
            <div className="profile-email">{GOOGLE_BACKUP_ENABLED && ledger.state.signedIn ? (googleUser.email || 'Google connected') : 'Firebase Google login • Cloudflare KV sync'}</div>
            <div className="profile-sync"><div className="sync-dot" />{GOOGLE_BACKUP_ENABLED && ledger.state.signedIn ? `KV ${backup.status || 'ready'} • ${lastBackupText}` : 'Local mode • sign in to sync across devices'}</div>
          </div>
        </div>

        <div className="settings-section">
          <div className="section-label">Account</div>
          <div className="settings-item" onClick={handleGoogleAccountClick}>
            <div className="s-icon accent-menu-icon"><i className="ti ti-brand-google" /></div>
            <div className="s-text"><div className="s-name">Google Account</div><div className="s-sub">{GOOGLE_BACKUP_ENABLED && ledger.state.signedIn ? `Connected${googleUser.email ? ` • ${googleUser.email}` : ''} • tap to sign out` : GOOGLE_DISABLED_MESSAGE}</div></div>
            <i className={`ti ${GOOGLE_BACKUP_ENABLED && ledger.state.signedIn ? 'ti-logout' : 'ti-alert-circle'} s-arrow`} />
          </div>
          <div className={`settings-item ${isBackingUp ? 'settings-item-busy' : ''}`} onClick={GOOGLE_BACKUP_ENABLED && !isBackingUp && !isRestoring ? ledger.backupToFirebaseKv : ledger.showGoogleDeveloperMessage}>
            <div className="s-icon google-backup-menu-icon">{renderSpinnerOrIcon(isBackingUp, 'ti-cloud-upload')}</div>
            <div className="s-text"><div className="s-name">Cloudflare KV Backup</div><div className="s-sub">{GOOGLE_BACKUP_ENABLED ? (isBackingUp ? 'Saving encrypted backup to Cloudflare KV…' : ledger.state.signedIn ? `Save Firebase user backup • ${lastBackupText}` : 'Login required • Firebase Google + KV') : GOOGLE_DISABLED_MESSAGE}</div></div>
            <i className="ti ti-chevron-right s-arrow" />
          </div>
          <div className={`settings-item ${isRestoring ? 'settings-item-busy' : ''}`} onClick={GOOGLE_BACKUP_ENABLED && !isBackingUp && !isRestoring ? () => setRestoreConfirmOpen(true) : ledger.showGoogleDeveloperMessage}>
            <div className="s-icon google-restore-menu-icon">{renderSpinnerOrIcon(isRestoring, 'ti-cloud-download')}</div>
            <div className="s-text"><div className="s-name">Restore KV Backup</div><div className="s-sub">{GOOGLE_BACKUP_ENABLED ? (isRestoring ? 'Restoring latest Cloudflare KV backup…' : 'Confirm first • same Google account backup replaces local data') : 'Use encrypted local backup until Firebase is configured'}</div></div>
            <i className="ti ti-chevron-right s-arrow" />
          </div>
          <div className="settings-item" onClick={GOOGLE_BACKUP_ENABLED ? ledger.toggleAutoGoogleBackup : ledger.showGoogleDeveloperMessage}>
            <div className="s-icon" style={{ background: 'rgba(48,212,138,0.12)', color: 'var(--green)' }}><i className={`ti ${autoBackupOn ? 'ti-cloud-check' : 'ti-cloud-off'}`} /></div>
            <div className="s-text"><div className="s-name">Auto KV Backup</div><div className="s-sub">{GOOGLE_BACKUP_ENABLED ? (autoBackupOn ? 'On • saves encrypted changes to user KV' : 'Off • manual KV backup only') : 'Off • Firebase not configured'}</div></div>
            <div className="toggle-wrap"><div className={`toggle ${autoBackupOn ? 'on' : ''}`}><div className="toggle-thumb" /></div></div>
          </div>
          {GOOGLE_BACKUP_ENABLED && backup.error && <div className="empty-state mini-empty">Cloudflare KV: {backup.error}</div>}
          <div className="settings-item" onClick={() => setPicker('currency')}>
            <div className="s-icon" style={{ background: 'rgba(245,166,35,0.12)', color: 'var(--amber)' }}><i className="ti ti-currency-dollar" /></div>
            <div className="s-text"><div className="s-name">Currency</div><div className="s-sub">{currentCurrency.label} ({currentCurrency.code})</div></div>
            <i className="ti ti-chevron-right s-arrow" />
          </div>
        </div>

        <div className="settings-section">
          <div className="section-label">Local Backup</div>
          <div className="settings-item" onClick={ledger.toggleAutoLocalBackup}>
            <div className="s-icon" style={{ background: 'rgba(45,212,191,0.12)', color: 'var(--teal)' }}><i className={`ti ${autoLocalBackupOn ? 'ti-device-floppy' : 'ti-toggle-left'}`} /></div>
            <div className="s-text"><div className="s-name">Auto Local Backup</div><div className="s-sub">{getLocalAutoBackupSubtitle()}</div></div>
            <div className="toggle-wrap"><div className={`toggle ${autoLocalBackupOn ? 'on' : ''}`}><div className="toggle-thumb" /></div></div>
          </div>
          <div className={`settings-item ${isLocalBackupSaving ? 'settings-item-busy' : ''}`} onClick={isLocalBackupSaving || isLocalBackupRestoring ? undefined : ledger.backupToLocalFile}>
            <div className="s-icon" style={{ background: 'rgba(79,142,247,0.12)', color: 'var(--accent)' }}>{renderSpinnerOrIcon(isLocalBackupSaving, 'ti-download')}</div>
            <div className="s-text"><div className="s-name">Manual Local Backup</div><div className="s-sub">{getLocalManualBackupSubtitle()}</div></div>
            <i className="ti ti-chevron-right s-arrow" />
          </div>
          <div className={`settings-item ${isLocalBackupRestoring ? 'settings-item-busy' : ''}`} onClick={isLocalBackupSaving || isLocalBackupRestoring ? undefined : () => localRestoreInputRef.current?.click?.()}>
            <div className="s-icon" style={{ background: 'rgba(48,212,138,0.12)', color: 'var(--green)' }}>{renderSpinnerOrIcon(isLocalBackupRestoring, 'ti-file-import')}</div>
            <div className="s-text"><div className="s-name">Restore Local Backup</div><div className="s-sub">{getLocalRestoreSubtitle()}</div></div>
            <i className="ti ti-chevron-right s-arrow" />
          </div>
        </div>

        <div className="settings-section">
          <div className="section-label">Cloud Sync</div>
          <div className="backup-safety-note"><i className="ti ti-shield-lock" /><span>Cloudflare KV is the only cloud backup. Firebase Google login keeps each user backup separate, so the same account can restore on another device.</span></div>
        </div>

        <div className="settings-section">
          <div className="section-label">Today Currency Rates</div>
          <div className="settings-item" onClick={() => rateInfo?.refreshRates?.({ force: true })}>
            <div className="s-icon" style={{ background: 'rgba(79,142,247,0.12)', color: 'var(--accent)' }}><i className="ti ti-refresh" /></div>
            <div className="s-text"><div className="s-name">Refresh Rate</div><div className="s-sub">{rateInfo?.loading ? 'Updating live currency rates…' : `${rateInfo?.source || 'offline'} • ${rateInfo?.date || 'today'}`}</div></div>
            <i className="ti ti-chevron-right s-arrow" />
          </div>
          <div className="settings-item" onClick={() => setEditCurrencyOpen(true)}>
            <div className="s-icon" style={{ background: 'rgba(245,166,35,0.12)', color: 'var(--amber)' }}><i className="ti ti-currency-dollar" /></div>
            <div className="s-text"><div className="s-name">Edit Currency</div><div className="s-sub">Open USD, EUR, GBP, INR and other rate editor</div></div>
            <i className="ti ti-chevron-right s-arrow" />
          </div>
          {rateInfo?.error && <div className="empty-state mini-empty">{rateInfo.error}</div>}
        </div>

        <div className="settings-section">
          <div className="section-label">Preferences</div>
          <div className="settings-item" onClick={ledger.toggleTheme}>
            <div className="s-icon" style={{ background: 'rgba(167,139,250,0.12)', color: 'var(--purple)' }}><i className={`ti ${isLight ? 'ti-sun' : 'ti-moon'}`} /></div>
            <div className="s-text"><div className="s-name">Appearance</div><div className="s-sub">{isLight ? 'Light mode' : 'Dark mode'}</div></div>
            <div className="toggle-wrap"><div className={`toggle ${isLight ? '' : 'on'}`}><div className="toggle-thumb" /></div></div>
          </div>

          <div className="settings-item accent-picker-item">
            <div className="s-icon accent-menu-icon"><i className="ti ti-palette" /></div>
            <div className="s-text">
              <div className="s-name">Accent Color</div>
              <div className="s-sub">{currentAccent.label} • works in dark and light mode</div>
              <div className="accent-choice-row" role="list" aria-label="Choose app accent color">
                {accentThemes.map((theme) => (
                  <button
                    key={theme.value}
                    className={`accent-choice ${currentAccent.value === theme.value ? 'active' : ''}`}
                    type="button"
                    aria-label={`Use ${theme.label} accent color`}
                    title={theme.label}
                    style={{ '--choice-accent': theme.accent, '--choice-accent2': theme.accent2 }}
                    onClick={(event) => { event.stopPropagation(); ledger.setAccentColor(theme.value); }}
                  >
                    <span />
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="settings-item" onClick={ledger.toggleNotifications}>
            <div className="s-icon" style={{ background: 'rgba(240,92,110,0.12)', color: 'var(--red)' }}><i className={`ti ${notificationsOn ? 'ti-bell' : 'ti-bell-off'}`} /></div>
            <div className="s-text"><div className="s-name">Notifications</div><div className="s-sub">{notificationsOn ? 'Important only • release, export, reminders' : 'Disabled • no notification bar alerts'}</div></div>
            <div className="toggle-wrap"><div className={`toggle ${notificationsOn ? 'on' : ''}`}><div className="toggle-thumb" /></div></div>
          </div>
          <div className="settings-item" onClick={ledger.toggleTransactionSounds}>
            <div className="s-icon" style={{ background: 'rgba(45,212,191,0.12)', color: 'var(--teal)' }}><i className={`ti ${soundsOn ? 'ti-volume' : 'ti-volume-off'}`} /></div>
            <div className="s-text"><div className="s-name">Transaction Sounds</div><div className="s-sub">{soundsOn ? 'Enabled • sound after save/delete' : 'Disabled • silent transactions'}</div></div>
            <div className="toggle-wrap"><div className={`toggle ${soundsOn ? 'on' : ''}`}><div className="toggle-thumb" /></div></div>
          </div>
          <div className="settings-item" onClick={ledger.toggleCompactNumbers}>
            <div className="s-icon" style={{ background: 'rgba(79,142,247,0.12)', color: 'var(--accent)' }}><i className={`ti ${compactNumbersOn ? 'ti-letter-k' : 'ti-numbers'}`} /></div>
            <div className="s-text"><div className="s-name">Short Number Format</div><div className="s-sub">{compactNumbersOn ? 'Enabled • 100,000 shows as 100k' : 'Disabled • normal full numbers'}</div></div>
            <div className="toggle-wrap"><div className={`toggle ${compactNumbersOn ? 'on' : ''}`}><div className="toggle-thumb" /></div></div>
          </div>
          <div className="settings-item" onClick={handleBiometricClick}>
            <div className="s-icon" style={{ background: 'rgba(79,142,247,0.12)', color: 'var(--accent)' }}><i className="ti ti-fingerprint" /></div>
            <div className="s-text"><div className="s-name">Biometric Lock</div><div className="s-sub">{biometricOn ? 'Enabled • fingerprint first, PIN fallback' : pinOn ? 'Tap to enable fingerprint' : 'Create PIN first to enable fingerprint'}</div></div>
            <div className="toggle-wrap"><div className={`toggle ${biometricOn ? 'on' : ''}`}><div className="toggle-thumb" /></div></div>
          </div>
          <div className="settings-item" onClick={() => openPinSetup('', false)}>
            <div className="s-icon" style={{ background: 'rgba(245,166,35,0.12)', color: 'var(--amber)' }}><i className={`ti ${pinOn ? 'ti-lock-check' : 'ti-lock'}`} /></div>
            <div className="s-text"><div className="s-name">PIN Lock</div><div className="s-sub">{pinOn ? 'Enabled • tap to change/remove' : 'Set 4 or 8 digit backup PIN'}</div></div>
            <i className="ti ti-chevron-right s-arrow" />
          </div>
        </div>



        <div className="settings-section">
          <div className="section-label">Accounts</div>
          {ledger.accounts.length ? ledger.accounts.map((account) => (
            <div className="settings-item" key={account.id} onClick={() => openAccountDetails?.(account)}>
              <div className="s-icon" style={{ background: `color-mix(in srgb, var(--${account.color || 'accent'}) 14%, transparent)`, color: `var(--${account.color || 'accent'})` }}><i className={`ti ${account.icon || 'ti-wallet'}`} /></div>
              <div className="s-text"><div className="s-name">{account.name} <HiddenAccountBadge hidden={account.hideFromTotal} compact /></div><div className="s-sub">{account.hideFromTotal ? 'Hidden from total • tap to edit' : 'Tap to edit or delete'}</div></div>
              {account.hideFromTotal ? <i className="ti ti-eye-off s-arrow" /> : <i className="ti ti-edit s-arrow" />}
            </div>
          )) : (
            <div className="empty-state">No accounts yet. Use Home → Add account.</div>
          )}
        </div>

        <div className="settings-section">
          <div className="section-label">Categories</div>
          <div className="settings-item" onClick={openCategory}>
            <div className="s-icon" style={{ background: 'rgba(79,142,247,0.12)', color: 'var(--accent)' }}><i className="ti ti-category-plus" /></div>
            <div className="s-text"><div className="s-name">Create Category</div><div className="s-sub">Add custom icons and colors</div></div>
            <i className="ti ti-chevron-right s-arrow" />
          </div>
          <div className="settings-item" onClick={() => setCategorySettingOpen(true)}>
            <div className="s-icon" style={{ background: 'rgba(167,139,250,0.12)', color: 'var(--purple)' }}><i className="ti ti-category" /></div>
            <div className="s-text"><div className="s-name">Category Setting</div><div className="s-sub">Enable, disable, or delete custom categories</div></div>
            <i className="ti ti-chevron-right s-arrow" />
          </div>
        </div>

        <div className="settings-section">
          <div className="section-label">More</div>
          <div className="settings-item" onClick={() => setExportOpen(true)}>
            <div className="s-icon" style={{ background: 'rgba(245,166,35,0.12)', color: 'var(--amber)' }}><i className="ti ti-database-export" /></div>
            <div className="s-text"><div className="s-name">Export Data</div><div className="s-sub">Download Excel, JSON or PDF</div></div>
            <i className="ti ti-chevron-right s-arrow" />
          </div>
          <div className={`settings-item ${githubUpdate.hasUpdate ? 'settings-update-ready' : ''}`} onClick={openUpdater}>
            <div className="s-icon" style={{ background: githubUpdate.hasUpdate ? 'rgba(48,212,138,0.16)' : 'rgba(48,212,138,0.12)', color: githubUpdate.status === 'error' ? 'var(--amber)' : 'var(--green)' }}><i className={`ti ${getUpdaterIcon()}`} /></div>
            <div className="s-text"><div className="s-name">Check for Updates</div><div className="s-sub">{getUpdaterSubtitle()}</div></div>
            <i className="ti ti-chevron-right s-arrow" />
          </div>
          <div className="settings-item" onClick={requestResetAll}>
            <div className="s-icon" style={{ background: 'rgba(240,92,110,0.12)', color: 'var(--red)' }}><i className="ti ti-trash" /></div>
            <div className="s-text"><div className="s-name">Reset All Data</div><div className="s-sub">Back to zero</div></div>
            <i className="ti ti-chevron-right s-arrow" />
          </div>
        </div>

        <div className="settings-section developer-section">
          <div className="section-label">Developer</div>
          <div className="settings-item developer-link-item" onClick={() => openExternalLink('http://web.toxybox99.eu.org')}>
            <div className="s-icon developer-website-icon"><i className="ti ti-world-www" /></div>
            <div className="s-text"><div className="s-name">Website</div><div className="s-sub">http://web.toxybox99.eu.org</div></div>
            <i className="ti ti-external-link s-arrow" />
          </div>
          <div className="settings-item developer-link-item" onClick={() => openExternalLink('https://github.com/tharindu899')}>
            <div className="s-icon developer-owner-icon"><i className="ti ti-brand-github" /></div>
            <div className="s-text"><div className="s-name">Owner</div><div className="s-sub">https://github.com/tharindu899</div></div>
            <i className="ti ti-external-link s-arrow" />
          </div>
        </div>
      </div>
      <OptionPickerModal open={picker === 'currency'} title="Choose Currency" options={currencyOptions} value={ledger.state.currency || 'LKR'} onSelect={ledger.setCurrency} close={() => setPicker(null)} variant="currency" />
      <input ref={localRestoreInputRef} type="file" accept=".cnbak,.json,application/json,application/octet-stream" style={{ display: 'none' }} onChange={handleLocalRestoreFileChange} />
      <EditCurrencyModal open={editCurrencyOpen} close={() => setEditCurrencyOpen(false)} appCurrency={ledger.state.currency || 'LKR'} rateInfo={rateInfo} conversionRates={conversionRates} />
      <CategorySettingModal open={categorySettingOpen} close={() => setCategorySettingOpen(false)} categories={ledger.categories} disabledCategories={ledger.state.preferences?.disabledCategories || []} customCategories={ledger.state.customCategories || []} onToggleCategory={ledger.toggleCategoryEnabled} onDeleteCategory={requestDeleteCategory} />
      <ExportDataModal open={exportOpen} close={() => setExportOpen(false)} onExport={(format) => ledger.exportData(format, { rates: conversionRates })} />
      <PinSetupModal open={pinOpen} close={() => { setPinOpen(false); setEnableBioAfterPin(false); setPinReason(''); }} hasPin={pinOn} reason={pinReason} onSave={savePin} onRemove={ledger.removePinLock} />
      <ConfirmModal
        open={restoreConfirmOpen}
        title="Restore Cloudflare KV backup?"
        message="This replaces local CashNest X data with the latest encrypted backup from Cloudflare KV for the signed-in Firebase Google account. Create a local backup first if you are not sure."
        dangerLabel="Restore Backup"
        cancelLabel="Cancel"
        icon="ti-cloud-download"
        onCancel={() => setRestoreConfirmOpen(false)}
        onConfirm={confirmGoogleRestore}
      />
      <ConfirmModal
        open={localFileRestoreConfirmOpen}
        title="Restore local backup file?"
        message={`This replaces local CashNest X data with ${pendingLocalRestoreFile?.name || 'the selected encrypted backup file'}. Create an encrypted manual backup first if you are not sure.`}
        dangerLabel="Restore Local Backup"
        cancelLabel="Cancel"
        icon="ti-file-import"
        onCancel={() => { setLocalFileRestoreConfirmOpen(false); setPendingLocalRestoreFile(null); }}
        onConfirm={confirmLocalFileRestore}
      />
      <ConfirmModal
        open={!!cloudRestoreConfirm}
        title={`Restore ${getCloudProviderLabel(cloudRestoreConfirm)} backup?`}
        message={`This replaces local CashNest X data with the latest encrypted backup from ${getCloudProviderLabel(cloudRestoreConfirm)}. Create a manual local backup first if you are not sure.`}
        dangerLabel="Restore Cloud Backup"
        cancelLabel="Cancel"
        icon="ti-brand-cloudflare"
        onCancel={() => setCloudRestoreConfirm(null)}
        onConfirm={confirmCloudRestore}
      />
      <ConfirmModal
        open={!!deleteConfirm}
        title={deleteConfirm?.title}
        message={deleteConfirm?.message}
        dangerLabel={deleteConfirm?.label || 'Delete'}
        cancelLabel="Keep"
        icon="ti-trash"
        onCancel={() => setDeleteConfirm(null)}
        onConfirm={confirmDeleteAction}
      />
      <ConfirmModal
        open={signOutConfirmOpen}
        title="Sign out Google?"
        message="Your CashNest X data stays on this device. Firebase KV sync stops until you login again."
        dangerLabel="Sign Out"
        cancelLabel="Stay Logged In"
        icon="ti-logout"
        onCancel={() => setSignOutConfirmOpen(false)}
        onConfirm={confirmGoogleSignOut}
      />
    </div>
  );
}
