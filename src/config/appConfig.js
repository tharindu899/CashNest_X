export const APP_NAME = (import.meta.env.VITE_APP_NAME || 'CashNest X').trim();
export const APP_PACKAGE_NAME = (import.meta.env.VITE_APP_PACKAGE_NAME || 'com.cashnest_x.pub').trim();

// Public APK mode no longer blocks Google login by itself.
// Firebase values decide whether Firebase Google login + KV sync are available.
export const IS_PUBLIC_APK = (import.meta.env.VITE_PUBLIC_APK || 'true').trim().toLowerCase() !== 'false';

const legacyGoogleEnabled = (import.meta.env.VITE_ENABLE_GOOGLE_BACKUP || '').trim().toLowerCase() === 'true';
const firebaseRequested = (import.meta.env.VITE_ENABLE_FIREBASE_AUTH || '').trim().toLowerCase() === 'true' || legacyGoogleEnabled;
const firebaseApiKey = (import.meta.env.VITE_FIREBASE_API_KEY || '').trim();
const firebaseProjectId = (import.meta.env.VITE_FIREBASE_PROJECT_ID || '').trim();
const firebaseAuthDomain = (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || `${firebaseProjectId}.firebaseapp.com`).trim();
const firebaseWebClientId = (import.meta.env.VITE_FIREBASE_WEB_CLIENT_ID || import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim();

export const FIREBASE_CONFIG = {
  apiKey: firebaseApiKey,
  projectId: firebaseProjectId,
  authDomain: firebaseAuthDomain,
  webClientId: firebaseWebClientId
};

export const FIREBASE_AUTH_ENABLED = firebaseRequested
  && Boolean(FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.projectId && FIREBASE_CONFIG.webClientId);

export const GOOGLE_DISABLED_MESSAGE = FIREBASE_AUTH_ENABLED
  ? ''
  : 'Firebase Google login is not configured. Ask the developer to add VITE_ENABLE_FIREBASE_AUTH=true, VITE_FIREBASE_API_KEY, VITE_FIREBASE_PROJECT_ID, and VITE_FIREBASE_WEB_CLIENT_ID.';

// Compatibility name used by existing UI/hook code. It now means Firebase Google login + KV sync.
export const GOOGLE_BACKUP_ENABLED = FIREBASE_AUTH_ENABLED;

export const CLOUDFLARE_BACKUP_CONFIG = {
  workerUrl: (import.meta.env.VITE_CLOUDFLARE_WORKER_URL || '').trim().replace(/\/+$/, ''),
  backupKey: (import.meta.env.VITE_CLOUDFLARE_BACKUP_KEY || '').trim()
};

export function isCloudflareBackupConfigured() {
  return Boolean(CLOUDFLARE_BACKUP_CONFIG.workerUrl && CLOUDFLARE_BACKUP_CONFIG.backupKey);
}

export function isFirebaseLoginConfigured() {
  return FIREBASE_AUTH_ENABLED;
}
