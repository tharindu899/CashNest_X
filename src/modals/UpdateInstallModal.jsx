import { useEffect, useMemo, useState } from 'react';
import { APP_VERSION, addNativeDownloadProgressListener, checkLatestRelease, compareVersions, formatBytes, getDownloadCount, getNativeDownloadState, installApkWithNativeProgress, normalizeDownloadProgress, openNativeDownloadedInstaller, showNativeUpdateAvailableNotification } from '../utils/updater';

function formatBytesZero(bytes = 0) {
  const value = Number(bytes || 0);
  return value <= 0 ? '0 B' : formatBytes(value);
}

function cleanVersionText(value = '') {
  return String(value || '').trim().replace(/^v/i, '').split('-')[0];
}

function cleanAutomaticReleaseNotes(body = '', version = '') {
  const raw = String(body || '').replace(/\r\n/g, '\n').trim();
  const fallbackVersion = version ? `v${String(version).replace(/^v/i, '')}` : '';
  if (!raw) {
    return fallbackVersion
      ? `# 🪺 CashNest X ${fallbackVersion}\nBeautiful money manager APK release.`
      : 'CashNest X update is ready.';
  }

  // New GitHub releases are already generated in the clean CashNest X format.
  // Keep the full body so the in-app updater shows New features, Bug fixes,
  // Changes, Install steps, and Build info exactly like the GitHub release.
  if (/^#\s+.*CashNest\s+v?\d+/im.test(raw) || /##\s+(?:✨\s*)?New features/i.test(raw)) {
    return raw;
  }

  // Backward fallback for older releases that only had version details.
  const versionLine = raw
    .split('\n')
    .map((line) => line.trim())
    .find((line) => /^[-*]\s+(?:New\s+version|Version):/i.test(line));

  if (versionLine) return `## Version Details\n${versionLine}`;
  return raw;
}

export default function UpdateInstallModal({ open, close, repo, notify, onReleaseAvailable, pauseLock }) {
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [data, setData] = useState(null);
  const [progress, setProgress] = useState({ received: 0, total: 0, percent: 0 });

  const asset = data?.asset;
  const release = data?.release;
  const hasUpdate = data?.hasUpdate;
  const assetSize = Number(asset?.size || 0);

  function isStateForCurrentAsset(info = {}) {
    if (!asset || !data?.latestVersion) return false;
    const stateVersion = cleanVersionText(info.version || '');
    const latest = cleanVersionText(data.latestVersion);
    if (stateVersion) return compareVersions(stateVersion, latest) === 0;
    // Old updater builds did not save the release version. Do not trust a
    // completed old APK here, because it can install the previous app version.
    if (String(info.status || '').toLowerCase().includes('complete') || String(info.status || '').toLowerCase().includes('install')) return false;
    const stateName = String(info.fileName || '').trim();
    return !!stateName && stateName === asset.name;
  }

  function resetStaleDownloadState() {
    setProgress({ received: 0, total: Number(asset?.size || 0), percent: 0 });
    setStatus('ready');
  }

  function applyNativeProgress(info = {}) {
    const next = normalizeDownloadProgress(info, assetSize || progress.total || 0);
    if (!isStateForCurrentAsset(next)) {
      if (String(next.status || '').toLowerCase().includes('complete') || String(next.status || '').toLowerCase().includes('install')) resetStaleDownloadState();
      return;
    }
    if (!next.received && !next.percent && !next.total) return;
    setProgress((prev) => ({
      received: Math.max(Number(prev.received || 0), Number(next.received || 0)),
      total: Math.max(Number(prev.total || 0), Number(next.total || 0), Number(assetSize || 0)),
      percent: Math.max(Number(prev.percent || 0), Number(next.percent || 0)),
      status: next.status || prev.status || 'downloading',
      filePath: next.filePath || prev.filePath || ''
    }));
    const currentStatus = String(next.status || '').toLowerCase();
    const nextTotal = Math.max(Number(next.total || 0), Number(assetSize || 0));
    const nextReceived = Number(next.received || 0);
    const completeEnough = nextTotal > 0 && nextReceived >= nextTotal * 0.9;
    if ((currentStatus.includes('complete') || currentStatus.includes('install')) && completeEnough) {
      setStatus('installing');
    } else if (currentStatus.includes('complete') && !completeEnough && nextTotal > 1024 * 1024) {
      // Ignore stale/broken private-repo downloads such as GitHub JSON metadata
      // files. The button stays available so the user can download the real APK.
      setStatus('ready');
    } else if (Number(next.percent || 0) > 0 || Number(next.received || 0) > 0) {
      setStatus((old) => (old === 'installing' ? old : 'downloading'));
    }
  }
  const changeText = useMemo(() => cleanAutomaticReleaseNotes(release?.body, data?.latestVersion), [release, data?.latestVersion]);

  useEffect(() => {
    if (!open) return;
    setStatus('checking');
    setError('');
    setData(null);
    setProgress({ received: 0, total: 0, percent: 0 });
    checkLatestRelease(repo)
      .then((next) => {
        setData(next);
        setProgress((prev) => ({ ...prev, total: Number(next?.asset?.size || prev.total || 0) }));
        setStatus(next.hasUpdate ? 'ready' : 'latest');
        if (next.hasUpdate) {
          onReleaseAvailable?.(next);
          showNativeUpdateAvailableNotification(next);
          getNativeDownloadState().then((state) => {
            if (!state || !next?.asset) return;
            const patchedState = normalizeDownloadProgress({ ...state, total: state.total || next.asset.size || 0 }, Number(next.asset.size || 0));
            const stateVersion = cleanVersionText(patchedState.version || '');
            const matches = stateVersion
              ? compareVersions(stateVersion, cleanVersionText(next.latestVersion)) === 0
              : String(patchedState.fileName || '') === next.asset.name && !String(patchedState.status || '').toLowerCase().includes('complete');
            if (!matches) return;
            setProgress({
              received: Number(patchedState.received || 0),
              total: Math.max(Number(patchedState.total || 0), Number(next.asset.size || 0)),
              percent: Number(patchedState.percent || 0),
              status: patchedState.status || 'downloading',
              filePath: patchedState.filePath || ''
            });
            const nativeStatus = String(patchedState.status || '').toLowerCase();
            if (nativeStatus.includes('complete') || nativeStatus.includes('install')) setStatus('installing');
            else if (Number(patchedState.received || 0) > 0 || Number(patchedState.percent || 0) > 0) setStatus('downloading');
          });
        }
      })
      .catch((err) => {
        setError(err?.message || 'Could not check for updates');
        setStatus('error');
      });
  }, [open, repo]);

  useEffect(() => {
    if (!open) return undefined;
    let mounted = true;
    let sub;
    addNativeDownloadProgressListener((info) => {
      if (!mounted) return;
      applyNativeProgress(info);
    }).then((listener) => { sub = listener; });
    return () => {
      mounted = false;
      try { sub?.remove?.(); } catch (error) {}
    };
  }, [open, assetSize]);

  useEffect(() => {
    if (!open || !['downloading', 'installing'].includes(status)) return undefined;
    let mounted = true;
    const poll = async () => {
      const state = await getNativeDownloadState();
      if (!mounted || !state) return;
      const patchedState = { ...state, total: state.total || assetSize || progress.total || 0 };
      applyNativeProgress(patchedState);
      const nativeStatus = String(state.status || '').toLowerCase();
      if (nativeStatus === 'complete' && isStateForCurrentAsset(patchedState)) setStatus('installing');
      if (nativeStatus === 'error') {
        setError('APK download failed');
        setStatus('error');
      }
    };
    poll();
    const timer = setInterval(poll, 1200);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [open, status, assetSize, progress.total]);

  if (!open) return null;

  async function installUpdate() {
    if (status === 'installing') {
      const state = await getNativeDownloadState();
      if (state && !isStateForCurrentAsset(state)) {
        resetStaleDownloadState();
        notify?.('Old downloaded APK removed from updater state. Download the new version again.', 'ti-download');
        return;
      }
      const opened = await openNativeDownloadedInstaller();
      if (!opened) notify?.('Tap Install in the notification bar to finish the update.', 'ti-download');
      return;
    }
    if (!asset) {
      if (data?.releaseUrl) window.open(data.releaseUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    pauseLock?.(30000);
    setStatus('downloading');
    setError('');
    setProgress((prev) => ({ ...prev, total: Number(asset.size || prev.total || 0), status: 'downloading' }));
    try {
      const result = await installApkWithNativeProgress(asset, (info) => applyNativeProgress(info));
      pauseLock?.(30000);
      if (result?.queued) {
        setStatus('downloading');
        notify?.('Update download started. It continues when the screen is off.', 'ti-download');
      } else {
        setStatus('installing');
        notify?.('Download complete. Tap Install in notification bar if installer does not open.', 'ti-download');
      }
    } catch (err) {
      setError(err?.message || 'APK install failed');
      setStatus('error');
    }
  }

  const percent = Math.max(0, Math.min(100, Number(progress.percent || 0)));
  const totalSize = Math.max(Number(progress.total || 0), Number(asset?.size || 0));
  const actionLabel = status === 'downloading' ? 'Downloading…' : status === 'installing' ? 'Install Now' : asset ? 'Download & Install' : 'Open Release Page';

  return (
    <div className="modal-overlay open update-overlay" onClick={close}>
      <div className="modal-sheet update-sheet update-sheet-fixed" onClick={(event) => event.stopPropagation()}>
        <div className="modal-handle" />
        <div className="update-head">
          <div className="update-big-icon"><i className="ti ti-download" /></div>
          <div>
            <div className="modal-title update-title-clean">CashNest X Update</div>
            <div className="update-muted">Installed v{APP_VERSION}</div>
          </div>
          <button className="icon-btn close-round" type="button" onClick={close}><i className="ti ti-x" /></button>
        </div>

        <div className="update-scroll-body">
          {status === 'checking' && (
            <div className="update-state-card">
              <i className="ti ti-loader-2 spin" />
              <span>Checking GitHub Releases...</span>
            </div>
          )}

          {status === 'latest' && (
            <>
              <div className="update-state-card ok">
                <i className="ti ti-circle-check" />
                <div>
                  <strong>You are already updated</strong>
                  <p>Installed v{APP_VERSION} • Latest release v{data?.latestVersion || APP_VERSION}</p>
                </div>
              </div>

              <div className="update-version-card installed-release-card">
                <div>
                  <span>Installed</span>
                  <strong>v{APP_VERSION}</strong>
                </div>
                <i className="ti ti-circle-check" />
                <div>
                  <span>GitHub latest</span>
                  <strong>v{data?.latestVersion || APP_VERSION}</strong>
                </div>
              </div>

              <div className="update-notes update-notes-fixed installed-release-notes">
                <div className="section-label">Installed Version Release Notes</div>
                <pre>{changeText}</pre>
              </div>
            </>
          )}

          {(status === 'ready' || status === 'downloading' || status === 'installing') && (
            <>
              <div className="update-version-card">
                <div>
                  <span>New version</span>
                  <strong>v{data?.latestVersion}</strong>
                </div>
                <i className="ti ti-arrow-up-right" />
                <div>
                  <span>Current</span>
                  <strong>v{APP_VERSION}</strong>
                </div>
              </div>

              <div className="update-info-grid">
                <div className="update-info-box"><i className="ti ti-package" /><span>Size</span><strong>{formatBytes(totalSize)}</strong></div>
                <div className="update-info-box"><i className="ti ti-download" /><span>Downloads</span><strong>{getDownloadCount(asset)}</strong></div>
              </div>

              <div className="update-notes update-notes-fixed">
                <div className="section-label">Release Notes</div>
                <pre>{changeText}</pre>
              </div>

              {(status === 'downloading' || status === 'installing') && (
                <div className="download-progress-card compact-progress-card">
                  <div className="download-progress-top">
                    <span>{status === 'installing' ? 'Ready to install' : 'Downloading in background...'}</span>
                    <strong>{Math.round(percent)}%</strong>
                  </div>
                  <div className="download-progress-track"><div style={{ width: `${percent}%` }} /></div>
                  <div className="download-progress-sub">{formatBytesZero(progress.received)} / {formatBytesZero(totalSize)}</div>
                </div>
              )}
            </>
          )}

          {status === 'error' && (
            <div className="update-state-card error">
              <i className="ti ti-alert-triangle" />
              <div>
                <strong>Update check failed</strong>
                <p>{error}</p>
              </div>
            </div>
          )}
        </div>

        {(hasUpdate || status === 'ready' || status === 'downloading' || status === 'installing') && (
          <div className="update-action-footer update-action-footer-two">
            <button className="save-btn" type="button" disabled={status === 'downloading'} onClick={installUpdate}>
              {actionLabel}
            </button>
            <button className="ghost-btn update-later-btn" type="button" disabled={status === 'downloading'} onClick={close}>
              Later
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
