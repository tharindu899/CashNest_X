import { APP_NAME, CLOUDFLARE_BACKUP_CONFIG, isCloudflareBackupConfigured } from '../config/appConfig';
import { createEncryptedBackupContent, parseLocalBackupText } from '../utils/localBackup';

const CLOUD_TIMEOUT_MS = 30000;
const CLOUDFLARE_LABEL = 'Cloudflare Worker KV';

function missingConfigError(label, missing) {
  return new Error(`${label} backup is not configured. Ask the developer to set ${missing.join(', ')}.`);
}

function withTimeout(options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CLOUD_TIMEOUT_MS);
  const signal = options.signal ? mergeAbortSignals(options.signal, controller.signal) : controller.signal;
  return { signal, clear: () => clearTimeout(timer) };
}

function mergeAbortSignals(primarySignal, timeoutSignal) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (primarySignal?.aborted || timeoutSignal?.aborted) {
    controller.abort();
  } else {
    primarySignal?.addEventListener('abort', abort, { once: true });
    timeoutSignal?.addEventListener('abort', abort, { once: true });
  }
  return controller.signal;
}

async function cloudFetch(url, options = {}, label = 'Cloud backup') {
  const timeout = withTimeout(options);
  try {
    const response = await fetch(url, { ...options, signal: timeout.signal });
    if (!response.ok) {
      let message = `${response.status} ${response.statusText}`;
      try {
        const body = await response.json();
        message = body?.error?.message || body?.message || body?.error || message;
      } catch (_) {}
      throw new Error(message);
    }
    const text = await response.text();
    if (!text) return {};
    try { return JSON.parse(text); } catch { return { content: text }; }
  } catch (error) {
    if (error?.name === 'AbortError') throw new Error(`${label} timed out. Check internet connection and try again.`);
    throw error;
  } finally {
    timeout.clear();
  }
}

async function createEncryptedEnvelope(sourceState, sourceAccounts, provider) {
  const { googleAccessToken, googleIdToken, googleRefreshToken, firebaseUid, ...safeState } = sourceState || {};
  const { content, snapshot } = await createEncryptedBackupContent(safeState, sourceAccounts, { type: `${provider}-cloud` });
  return {
    fileName: `${APP_NAME.replace(/\s+/g, '-')}-${provider}-backup.cnbak`,
    savedAt: snapshot.createdAt,
    payload: JSON.parse(content)
  };
}

function unwrapRemotePayload(remote) {
  if (!remote) return null;
  if (typeof remote === 'string') {
    try { return JSON.parse(remote); } catch { return null; }
  }
  if (remote.payload && typeof remote.payload === 'object') return remote.payload;
  if (remote.backup && typeof remote.backup === 'object') return remote.backup;
  if (remote.data?.payload && typeof remote.data.payload === 'object') return remote.data.payload;
  if (remote.data?.encrypted) return remote.data;
  if (remote.encrypted) return remote;
  return null;
}

async function parseCloudBackup(remote) {
  const envelope = unwrapRemotePayload(remote);
  if (!envelope) throw new Error('Cloud backup response is empty or invalid.');
  const { restored, parsed } = await parseLocalBackupText(JSON.stringify(envelope));
  return {
    state: restored,
    parsed,
    createdAt: parsed?.createdAt || parsed?.exportedAt || '',
    modifiedTime: remote?.updated_at || remote?.updatedAt || remote?.modifiedTime || parsed?.exportedAt || parsed?.createdAt || ''
  };
}

function providerHeaders(firebaseIdToken, extra = {}) {
  if (!firebaseIdToken) throw new Error('Connect Google Account first. Firebase login is required for multi-device KV sync.');
  return {
    'Content-Type': 'application/json',
    'X-CashNest-Backup-Key': CLOUDFLARE_BACKUP_CONFIG.backupKey,
    Authorization: `Bearer ${firebaseIdToken}`,
    ...extra
  };
}

export function getCloudflareBackupStatus() {
  const missing = [];
  if (!CLOUDFLARE_BACKUP_CONFIG.workerUrl) missing.push('VITE_CLOUDFLARE_WORKER_URL');
  if (!CLOUDFLARE_BACKUP_CONFIG.backupKey) missing.push('VITE_CLOUDFLARE_BACKUP_KEY');
  return { label: CLOUDFLARE_LABEL, configured: isCloudflareBackupConfigured(), missing };
}

export async function backupToCloudflareWorker({ state, accounts, firebaseIdToken }) {
  const status = getCloudflareBackupStatus();
  if (!status.configured) throw missingConfigError(CLOUDFLARE_LABEL, status.missing);
  const encrypted = await createEncryptedEnvelope(state, accounts, 'cloudflare-kv');
  const user = state?.googleUser || {};
  const response = await cloudFetch(`${CLOUDFLARE_BACKUP_CONFIG.workerUrl}/backup`, {
    method: 'PUT',
    headers: providerHeaders(firebaseIdToken),
    body: JSON.stringify({
      app: APP_NAME,
      fileName: encrypted.fileName,
      savedAt: encrypted.savedAt,
      user: {
        uid: state?.firebaseUid || user?.firebaseUid || user?.uid || '',
        email: user?.email || ''
      },
      payload: encrypted.payload
    })
  }, CLOUDFLARE_LABEL);
  return { ...response, savedAt: response?.savedAt || encrypted.savedAt, fileName: encrypted.fileName };
}

export async function restoreFromCloudflareWorker({ firebaseIdToken }) {
  const status = getCloudflareBackupStatus();
  if (!status.configured) throw missingConfigError(CLOUDFLARE_LABEL, status.missing);
  const response = await cloudFetch(`${CLOUDFLARE_BACKUP_CONFIG.workerUrl}/backup`, {
    method: 'GET',
    headers: providerHeaders(firebaseIdToken)
  }, CLOUDFLARE_LABEL);
  return parseCloudBackup(response);
}
