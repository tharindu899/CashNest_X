import { Capacitor, registerPlugin } from '@capacitor/core';

const enc = new TextEncoder();
const BIO_ID_KEY = 'cashnest_x_bio_credential_id';
const NativeBiometricAuth = registerPlugin('NativeBiometricAuth');

function toBase64Url(bytes) {
  const bin = String.fromCharCode(...new Uint8Array(bytes));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(value) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4);
  const bin = atob(padded);
  return Uint8Array.from(bin, (ch) => ch.charCodeAt(0));
}

function isNativeAndroid() {
  try { return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'; } catch { return false; }
}

export async function hashPin(pin, salt) {
  const clean = String(pin || '').trim();
  const digest = await crypto.subtle.digest('SHA-256', enc.encode(`${salt}:${clean}:cashnest_x`));
  return toBase64Url(digest);
}

export function createPinSalt() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return toBase64Url(bytes);
}

export function canUseBiometricApi() {
  return typeof window !== 'undefined' && !!window.PublicKeyCredential && !!navigator.credentials;
}

export async function isPlatformBiometricAvailable() {
  if (isNativeAndroid()) {
    try {
      const result = await NativeBiometricAuth.isAvailable();
      return !!result?.available;
    } catch {
      return false;
    }
  }
  try {
    if (!canUseBiometricApi() || !PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable) return false;
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

async function verifyNativeBiometric(reason = 'Unlock CashNest X') {
  try {
    const result = await NativeBiometricAuth.verify({
      title: 'Unlock CashNest X',
      subtitle: 'Use your fingerprint or screen lock',
      reason
    });
    return { ok: !!result?.verified };
  } catch (error) {
    return { ok: false, reason: error?.message || 'Biometric cancelled. Use PIN.' };
  }
}

export async function setupBiometricCredential() {
  if (isNativeAndroid()) {
    const available = await isPlatformBiometricAvailable();
    if (!available) return { ok: false, reason: 'No fingerprint/screen lock found. Add fingerprint or PIN in Android Settings, then try again.' };
    const verified = await verifyNativeBiometric('Confirm fingerprint to enable CashNest X biometric lock');
    if (!verified.ok) return verified;
    localStorage.setItem(BIO_ID_KEY, 'native-android-biometric');
    return { ok: true, native: true };
  }

  const available = await isPlatformBiometricAvailable();
  if (!available) {
    return {
      ok: false,
      reason: 'Browser biometric is not available here. Install the APK to use Android fingerprint, or set a PIN for local testing.'
    };
  }
  try {
    const challenge = new Uint8Array(32);
    crypto.getRandomValues(challenge);
    const userId = new Uint8Array(16);
    crypto.getRandomValues(userId);
    const credential = await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { name: 'CashNest X' },
        user: { id: userId, name: 'cashnest_x-user', displayName: 'CashNest X User' },
        pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
        authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'preferred' },
        timeout: 60000,
        attestation: 'none'
      }
    });
    if (!credential?.rawId) return { ok: false, reason: 'Biometric setup was cancelled.' };
    const id = toBase64Url(credential.rawId);
    localStorage.setItem(BIO_ID_KEY, id);
    return { ok: true };
  } catch (error) {
    return { ok: false, reason: error?.message || 'Biometric setup failed.' };
  }
}

export async function verifyBiometricCredential() {
  if (isNativeAndroid()) {
    const saved = localStorage.getItem(BIO_ID_KEY);
    if (!saved) return { ok: false, reason: 'Biometric is not set up yet. Use PIN.' };
    return verifyNativeBiometric('Unlock CashNest X');
  }

  const available = await isPlatformBiometricAvailable();
  if (!available) return { ok: false, reason: 'Biometric is not available here. Use PIN.' };
  const savedId = localStorage.getItem(BIO_ID_KEY);
  if (!savedId) return { ok: false, reason: 'Biometric is not set up yet. Use PIN.' };
  try {
    const challenge = new Uint8Array(32);
    crypto.getRandomValues(challenge);
    await navigator.credentials.get({
      publicKey: {
        challenge,
        allowCredentials: [{ id: fromBase64Url(savedId), type: 'public-key' }],
        userVerification: 'required',
        timeout: 60000
      }
    });
    return { ok: true };
  } catch (error) {
    return { ok: false, reason: error?.message || 'Biometric unlock cancelled.' };
  }
}

export function clearBiometricCredential() {
  localStorage.removeItem(BIO_ID_KEY);
}
