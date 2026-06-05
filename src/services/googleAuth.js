import { Capacitor, registerPlugin } from '@capacitor/core';
import { APP_PACKAGE_NAME, FIREBASE_AUTH_ENABLED, FIREBASE_CONFIG, GOOGLE_DISABLED_MESSAGE } from '../config/appConfig';

const GOOGLE_AUTH_SCOPES = ['profile', 'email'];
const CashNestGoogle = registerPlugin('CashNestGoogle');
const GOOGLE_AUTH_TIMEOUT_MS = 45000;
const FIREBASE_AUTH_TIMEOUT_MS = 30000;

function withTimeout(promise, ms, message) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function firebaseAuthUrl(path) {
  if (!FIREBASE_CONFIG.apiKey) throw new Error('Missing VITE_FIREBASE_API_KEY.');
  return `https://identitytoolkit.googleapis.com/v1/${path}?key=${encodeURIComponent(FIREBASE_CONFIG.apiKey)}`;
}

function firebaseSecureTokenUrl() {
  if (!FIREBASE_CONFIG.apiKey) throw new Error('Missing VITE_FIREBASE_API_KEY.');
  return `https://securetoken.googleapis.com/v1/token?key=${encodeURIComponent(FIREBASE_CONFIG.apiKey)}`;
}

async function firebaseFetch(url, body, label = 'Firebase Auth') {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FIREBASE_AUTH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const code = data?.error?.message || `${response.status} ${response.statusText}`;
      throw new Error(`${label} failed: ${friendlyFirebaseError(code)}`);
    }
    return data;
  } catch (error) {
    if (error?.name === 'AbortError') throw new Error(`${label} timed out. Check internet connection and try again.`);
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function friendlyFirebaseError(code = '') {
  const value = String(code || 'unknown error');
  const map = {
    INVALID_IDP_RESPONSE: 'Google login token was rejected. Check Firebase Authentication → Sign-in method → Google provider.',
    OPERATION_NOT_ALLOWED: 'Google provider is disabled in Firebase Authentication.',
    INVALID_API_KEY: 'Firebase API key is invalid. Check VITE_FIREBASE_API_KEY.',
    PROJECT_NOT_FOUND: 'Firebase project ID is invalid. Check VITE_FIREBASE_PROJECT_ID.',
    TOKEN_EXPIRED: 'Firebase session expired. Sign in again.',
    USER_DISABLED: 'This Firebase user is disabled.'
  };
  return map[value] || value.replace(/_/g, ' ').toLowerCase();
}

function normalizeGoogleResult(result = {}) {
  const auth = result.authentication || result.auth || {};
  const profile = result.profile || result.user || result;
  return {
    name: profile.name || profile.displayName || result.name || 'Google User',
    email: profile.email || result.email || '',
    imageUrl: profile.imageUrl || profile.picture || profile.photoUrl || result.imageUrl || '',
    id: profile.id || result.id || '',
    googleIdToken: auth.idToken || result.googleIdToken || result.idToken || result.id_token || ''
  };
}

function normalizeFirebaseSession(firebase = {}, googleUser = {}) {
  return {
    name: firebase.displayName || googleUser.name || 'Google User',
    email: firebase.email || googleUser.email || '',
    imageUrl: firebase.photoUrl || googleUser.imageUrl || '',
    id: googleUser.id || firebase.federatedId || '',
    uid: firebase.localId || '',
    firebaseUid: firebase.localId || '',
    firebaseIdToken: firebase.idToken || '',
    firebaseRefreshToken: firebase.refreshToken || '',
    firebaseExpiresIn: Number(firebase.expiresIn || 3600),
    firebaseTokenIssuedAt: Date.now(),
    googleIdToken: googleUser.googleIdToken || ''
  };
}

async function signInGoogleNative() {
  if (!Capacitor.isNativePlatform()) {
    throw new Error('Firebase Google login works in the Android APK. Build/install the APK first.');
  }
  if (!FIREBASE_CONFIG.webClientId) {
    throw new Error('Missing VITE_FIREBASE_WEB_CLIENT_ID. Use the Web client ID from Firebase/Google Cloud.');
  }
  const result = await withTimeout(
    CashNestGoogle.signIn({
      serverClientId: FIREBASE_CONFIG.webClientId,
      scopes: GOOGLE_AUTH_SCOPES
    }),
    GOOGLE_AUTH_TIMEOUT_MS,
    'Google login timed out. Check Google Play Services and try again.'
  );
  const user = normalizeGoogleResult(result);
  if (!user.email) throw new Error('Google login did not return an account email. Check Google OAuth setup.');
  if (!user.googleIdToken) {
    throw new Error(`Google ID token missing. Add Android OAuth client with package ${APP_PACKAGE_NAME} and release SHA-1, then rebuild APK.`);
  }
  return user;
}

async function signInFirebaseWithGoogle(googleUser) {
  const requestUri = `https://${FIREBASE_CONFIG.authDomain || `${FIREBASE_CONFIG.projectId}.firebaseapp.com`}`;
  const firebase = await firebaseFetch(firebaseAuthUrl('accounts:signInWithIdp'), {
    postBody: `id_token=${encodeURIComponent(googleUser.googleIdToken)}&providerId=google.com`,
    requestUri,
    returnIdpCredential: true,
    returnSecureToken: true
  }, 'Firebase Google login');
  return normalizeFirebaseSession(firebase, googleUser);
}

export async function signInWithGoogle() {
  if (!FIREBASE_AUTH_ENABLED) throw new Error(GOOGLE_DISABLED_MESSAGE);
  const googleUser = await signInGoogleNative();
  return signInFirebaseWithGoogle(googleUser);
}

export async function refreshFirebaseSession(refreshToken) {
  if (!FIREBASE_AUTH_ENABLED) throw new Error(GOOGLE_DISABLED_MESSAGE);
  if (!refreshToken) throw new Error('Firebase session expired. Sign in again.');
  const form = new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FIREBASE_AUTH_TIMEOUT_MS);
  try {
    const response = await fetch(firebaseSecureTokenUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form,
      signal: controller.signal
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const code = data?.error?.message || `${response.status} ${response.statusText}`;
      throw new Error(`Firebase session refresh failed: ${friendlyFirebaseError(code)}`);
    }
    return {
      firebaseIdToken: data.id_token || '',
      firebaseRefreshToken: data.refresh_token || refreshToken,
      firebaseUid: data.user_id || '',
      firebaseExpiresIn: Number(data.expires_in || 3600),
      firebaseTokenIssuedAt: Date.now()
    };
  } catch (error) {
    if (error?.name === 'AbortError') throw new Error('Firebase session refresh timed out. Check internet connection and try again.');
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

// Compatibility export used by older hook code. It now returns a Firebase ID token, not a Firebase token.
export async function getFreshGoogleAccessToken(refreshToken) {
  const session = await refreshFirebaseSession(refreshToken);
  return session.firebaseIdToken;
}

export async function clearGoogleAccessToken() {
  // Firebase ID tokens are stateless JWTs; there is no native token cache to clear here.
}

export async function signOutGoogle() {
  try {
    if (Capacitor.isNativePlatform()) await CashNestGoogle.signOut();
  } catch (_) {
    // Local Firebase sign-out should still continue if native sign-out fails.
  }
}

export function hasGoogleClientId() {
  return FIREBASE_AUTH_ENABLED && !!FIREBASE_CONFIG.webClientId;
}
