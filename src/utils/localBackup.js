import { Capacitor, registerPlugin } from '@capacitor/core';
import { defaultState } from '../models/defaultState';
import { migrateLedgerState } from './ledgerMigration';

const NativeExport = registerPlugin('NativeExport');
const AUTO_BACKUP_STORE_KEY = 'cashnest_x_local_auto_backup_v1';
const LEGACY_AUTO_BACKUP_FILE_NAME = 'CashNest-auto-local-backup.json';
const AUTO_BACKUP_FILE_NAME = 'CashNest-X-auto-local-backup.cnbak';
const MANUAL_BACKUP_FILE_NAME = 'CashNest-X-Encrypted-Backup.cnbak';
const ANDROID_BACKUP_FOLDER_LABEL = 'Documents/CashNest X';
const APP_NAME = 'CashNest X';
const COMPATIBLE_APP_NAMES = ['CashNest', 'CashNest X'];
const LOCAL_BACKUP_VERSION = 'local-backup-v2-encrypted';
const ENCRYPTED_BACKUP_FORMAT = 'cashnest_x-local-encrypted-v1';
const ENCRYPTED_BACKUP_MIME = 'application/octet-stream';
const ENCRYPTION_ITERATIONS = 180000;
const ENCRYPTION_SECRET = 'CashNest::local-backup::aes-gcm::com.cashnest_x.app::v1';

function isNativeAndroid() {
  try {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
  } catch {
    return false;
  }
}

function fileStamp() {
  return new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
}

function textToBase64(text) {
  return bytesToBase64(new TextEncoder().encode(text));
}

function base64ToText(base64Data = '') {
  return new TextDecoder().decode(base64ToBytes(base64Data));
}

function bytesToBase64(bytes) {
  const source = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes || []);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < source.length; i += chunkSize) {
    binary += String.fromCharCode(...source.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function base64ToBytes(base64Data = '') {
  const binary = atob(String(base64Data || '').replace(/\s/g, ''));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function getCrypto() {
  const cryptoApi = globalThis.crypto || globalThis.msCrypto;
  if (!cryptoApi?.subtle || !cryptoApi.getRandomValues) throw new Error('Encrypted local backup is not supported on this device.');
  return cryptoApi;
}

async function deriveBackupKey(saltBytes) {
  const cryptoApi = getCrypto();
  const encoder = new TextEncoder();
  const baseKey = await cryptoApi.subtle.importKey(
    'raw',
    encoder.encode(ENCRYPTION_SECRET),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return cryptoApi.subtle.deriveKey(
    { name: 'PBKDF2', salt: saltBytes, iterations: ENCRYPTION_ITERATIONS, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function encryptLocalBackupContent(plainContent, snapshot) {
  const cryptoApi = getCrypto();
  const salt = new Uint8Array(16);
  const iv = new Uint8Array(12);
  cryptoApi.getRandomValues(salt);
  cryptoApi.getRandomValues(iv);
  const key = await deriveBackupKey(salt);
  const encryptedBuffer = await cryptoApi.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(plainContent));

  return JSON.stringify({
    app: APP_NAME,
    version: LOCAL_BACKUP_VERSION,
    format: ENCRYPTED_BACKUP_FORMAT,
    encrypted: true,
    cipher: 'AES-GCM',
    kdf: 'PBKDF2-SHA256',
    iterations: ENCRYPTION_ITERATIONS,
    createdAt: snapshot.createdAt,
    exportedAt: snapshot.exportedAt || snapshot.createdAt,
    backupType: snapshot.backupType,
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    payload: bytesToBase64(new Uint8Array(encryptedBuffer))
  }, null, 2);
}

async function decryptLocalBackupContent(envelope) {
  if (!envelope?.encrypted || envelope?.format !== ENCRYPTED_BACKUP_FORMAT) return envelope;
  try {
    const salt = base64ToBytes(envelope.salt);
    const iv = base64ToBytes(envelope.iv);
    const payload = base64ToBytes(envelope.payload);
    const key = await deriveBackupKey(salt);
    const decryptedBuffer = await getCrypto().subtle.decrypt({ name: 'AES-GCM', iv }, key, payload);
    return JSON.parse(new TextDecoder().decode(decryptedBuffer));
  } catch (error) {
    throw new Error('Encrypted backup restore failed. Choose a valid CashNest X encrypted backup.');
  }
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

async function tryWebShare(blob, filename) {
  if (!navigator.share || typeof File === 'undefined') return false;
  const file = new File([blob], filename, { type: ENCRYPTED_BACKUP_MIME });
  if (navigator.canShare && !navigator.canShare({ files: [file] })) return false;
  await navigator.share({ files: [file], title: filename, text: 'CashNest X encrypted local backup' });
  return true;
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function safeObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function stripRemovedPreferences(preferences = {}) {
  const {
    bankSmsAutoSync,
    bankSmsLastSyncAt,
    bankSmsLastImportCount,
    bankSmsLastScannedCount,
    bankSmsPermissionMessage,
    bankSmsImportedHashes,
    ...safePreferences
  } = safeObject(preferences);
  return safePreferences;
}

export function cleanStateForLocalBackup(sourceState = {}, sourceAccounts = []) {
  const state = safeObject(sourceState);
  const preferences = stripRemovedPreferences(state.preferences);
  return {
    ...state,
    signedIn: false,
    googleAccessToken: '',
    googleIdToken: '',
    googleUser: state.googleUser ? { ...safeObject(state.googleUser), imageUrl: '' } : null,
    googleBackup: {
      ...(safeObject(state.googleBackup)),
      status: state.googleBackup?.status || 'local-only',
      error: '',
      accessToken: '',
      idToken: ''
    },
    accounts: safeArray(sourceAccounts).length ? sourceAccounts : safeArray(state.accounts),
    transactions: safeArray(state.transactions),
    loans: safeArray(state.loans),
    budgets: safeArray(state.budgets),
    customCategories: safeArray(state.customCategories),
    notifications: safeArray(state.notifications),
    archivedNotifications: safeArray(state.archivedNotifications),
    preferences: {
      ...preferences,
      pinHash: '',
      pinSalt: '',
      biometricLock: false,
      pinLock: false
    }
  };
}

export function createLocalBackupSnapshot(sourceState = {}, sourceAccounts = [], options = {}) {
  const createdAt = new Date().toISOString();
  const data = cleanStateForLocalBackup(sourceState, sourceAccounts);
  return {
    app: APP_NAME,
    version: LOCAL_BACKUP_VERSION,
    backupType: options.type || 'local',
    encrypted: true,
    createdAt,
    exportedAt: createdAt,
    currency: data.currency || 'LKR',
    summary: {
      accounts: safeArray(data.accounts).length,
      transactions: safeArray(data.transactions).length,
      loans: safeArray(data.loans).length,
      budgets: safeArray(data.budgets).length,
      customCategories: safeArray(data.customCategories).length
    },
    data
  };
}

export function localBackupSignature(state = {}) {
  const source = safeObject(state);
  return JSON.stringify({
    onboardingComplete: source.onboardingComplete,
    userName: source.userName,
    currency: source.currency,
    theme: source.theme,
    accentColor: source.accentColor,
    accounts: source.accounts,
    transactions: source.transactions,
    loans: source.loans,
    budgets: source.budgets,
    customCategories: source.customCategories,
    disabledCategories: source.preferences?.disabledCategories || [],
    preferences: {
      notifications: source.preferences?.notifications,
      transactionSounds: source.preferences?.transactionSounds,
      compactNumbers: source.preferences?.compactNumbers,
      autoLocalBackup: source.preferences?.autoLocalBackup,
      autoGoogleBackup: source.preferences?.autoGoogleBackup
    }
  });
}

export function describeLocalBackupTime(value) {
  if (!value) return 'not backed up yet';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'not backed up yet';
  return date.toLocaleString([], { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

async function saveManualBackupContent(content, filename) {
  const mimeType = ENCRYPTED_BACKUP_MIME;
  if (isNativeAndroid()) {
    const saved = await NativeExport.saveFile({
      fileName: filename,
      mimeType,
      base64Data: textToBase64(content),
      directory: 'Documents',
      folder: 'CashNest X',
      replaceExisting: true
    });
    return {
      method: saved?.method || 'android-documents',
      filename,
      fileName: filename,
      size: saved?.size || content.length,
      uri: saved?.uri,
      path: saved?.path || `${ANDROID_BACKUP_FOLDER_LABEL}/${filename}`,
      folder: saved?.folder || ANDROID_BACKUP_FOLDER_LABEL,
      replaced: saved?.replaced === true,
      mimeType
    };
  }

  const blob = new Blob([content], { type: `${ENCRYPTED_BACKUP_MIME};charset=utf-8` });
  try {
    const shared = await tryWebShare(blob, filename);
    if (shared) return { method: 'share', filename, fileName: filename, size: blob.size, mimeType };
  } catch {}
  downloadBlob(blob, filename);
  return { method: 'browser-download', filename, fileName: filename, size: blob.size, mimeType };
}

export async function createEncryptedBackupContent(sourceState, sourceAccounts = [], options = {}) {
  const snapshot = createLocalBackupSnapshot(sourceState, sourceAccounts, { type: options.type || 'manual-local' });
  const plainContent = JSON.stringify(snapshot, null, 2);
  const content = await encryptLocalBackupContent(plainContent, snapshot);
  return { content, snapshot };
}

export async function saveManualLocalBackup(sourceState, sourceAccounts = []) {
  const { content, snapshot } = await createEncryptedBackupContent(sourceState, sourceAccounts, { type: 'manual-local' });
  const filename = MANUAL_BACKUP_FILE_NAME;
  const result = await saveManualBackupContent(content, filename);
  return { ...result, savedAt: snapshot.createdAt, snapshot };
}

export async function saveAutomaticLocalBackup(sourceState, sourceAccounts = []) {
  const snapshot = createLocalBackupSnapshot(sourceState, sourceAccounts, { type: 'auto-local' });
  const plainContent = JSON.stringify(snapshot, null, 2);
  const content = await encryptLocalBackupContent(plainContent, snapshot);
  let nativeResult = null;

  try {
    localStorage.setItem(AUTO_BACKUP_STORE_KEY, content);
  } catch (error) {
    console.warn('Auto local backup storage failed:', error);
  }

  if (isNativeAndroid()) {
    try {
      nativeResult = await NativeExport.saveLocalBackup({
        fileName: AUTO_BACKUP_FILE_NAME,
        mimeType: ENCRYPTED_BACKUP_MIME,
        base64Data: textToBase64(content),
        directory: 'Documents',
        folder: 'CashNest X',
        replaceExisting: true
      });
    } catch (error) {
      console.warn('Native auto local backup failed:', error);
    }
  }

  return {
    saved: true,
    savedAt: snapshot.createdAt,
    filename: AUTO_BACKUP_FILE_NAME,
    fileName: AUTO_BACKUP_FILE_NAME,
    method: nativeResult?.method || (isNativeAndroid() ? 'android-documents-fallback' : 'browser-local-storage'),
    path: nativeResult?.path || (isNativeAndroid() ? `${ANDROID_BACKUP_FOLDER_LABEL}/${AUTO_BACKUP_FILE_NAME}` : ''),
    folder: nativeResult?.folder || (isNativeAndroid() ? ANDROID_BACKUP_FOLDER_LABEL : ''),
    replaced: nativeResult?.replaced === true,
    size: content.length,
    mimeType: ENCRYPTED_BACKUP_MIME
  };
}

export async function readAutomaticLocalBackupText() {
  if (isNativeAndroid()) {
    try {
      const result = await NativeExport.readLocalBackup({ fileName: AUTO_BACKUP_FILE_NAME, directory: 'Documents', folder: 'CashNest X' });
      if (result?.base64Data) return base64ToText(result.base64Data);
      if (result?.content) return result.content;
    } catch (error) {
      console.warn('Native encrypted auto backup read failed:', error);
      try {
        const legacy = await NativeExport.readLocalBackup({ fileName: LEGACY_AUTO_BACKUP_FILE_NAME, directory: 'Documents', folder: 'CashNest X' });
        if (legacy?.base64Data) return base64ToText(legacy.base64Data);
        if (legacy?.content) return legacy.content;
      } catch (legacyError) {
        console.warn('Native legacy auto backup read failed:', legacyError);
      }
    }
  }
  const raw = localStorage.getItem(AUTO_BACKUP_STORE_KEY);
  if (!raw) throw new Error('No automatic local backup found');
  return raw;
}

export async function readTextFile(file) {
  if (!file) throw new Error('Choose a backup file first');
  if (typeof file.text === 'function') return file.text();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Backup file read failed'));
    reader.readAsText(file);
  });
}

function stateFromSnapshot(parsed) {
  const source = safeObject(parsed);
  if (source.data && typeof source.data === 'object') return source.data;
  if (source.state && typeof source.state === 'object') return source.state;

  // Accept older CashNest X and legacy CashNest JSON exports too.
  if (COMPATIBLE_APP_NAMES.includes(source.app) || source.transactions || source.accounts || source.preferences) {
    return {
      ...defaultState,
      ...source,
      accounts: safeArray(source.accounts),
      transactions: safeArray(source.transactions),
      loans: safeArray(source.loans),
      budgets: safeArray(source.budgets),
      customCategories: safeArray(source.categories).length ? safeArray(source.categories) : safeArray(source.customCategories),
      notifications: safeArray(source.notifications),
      preferences: { ...(defaultState.preferences || {}), ...stripRemovedPreferences(source.preferences) }
    };
  }
  return null;
}

export async function parseLocalBackupText(content) {
  let parsed = null;
  try {
    parsed = JSON.parse(content || '');
  } catch (error) {
    throw new Error('Invalid backup file. Choose a CashNest X encrypted backup or old JSON backup.');
  }

  if (parsed?.encrypted && parsed?.format === ENCRYPTED_BACKUP_FORMAT) {
    parsed = await decryptLocalBackupContent(parsed);
  }

  const backupState = stateFromSnapshot(parsed);
  if (!backupState) throw new Error('This file is not a CashNest X backup.');

  const restored = migrateLedgerState({
    ...defaultState,
    ...backupState,
    signedIn: false,
    googleAccessToken: '',
    googleIdToken: '',
    googleBackup: {
      ...(defaultState.googleBackup || {}),
      ...(backupState.googleBackup || {}),
      status: 'local-restored',
      error: ''
    }
  });

  return { restored, parsed };
}

export async function parseLocalBackupFile(file) {
  const content = await readTextFile(file);
  return parseLocalBackupText(content);
}

export async function parseAutomaticLocalBackup() {
  const content = await readAutomaticLocalBackupText();
  return parseLocalBackupText(content);
}
