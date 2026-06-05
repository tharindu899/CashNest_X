import { Capacitor, registerPlugin } from '@capacitor/core';

const ReceiptScanner = registerPlugin('CashNestReceiptScanner');

export function canUseNativeReceiptScanner() {
  return Capacitor.isNativePlatform();
}

export async function scanReceiptWithNativeMlKit({ imageDataUrl = '', path = '', fileName = 'receipt.jpg' } = {}) {
  if (!canUseNativeReceiptScanner()) {
    throw new Error('Google ML Kit receipt scanner works inside the Android APK only.');
  }
  const result = await ReceiptScanner.scanReceipt({ imageDataUrl, path, fileName });
  return {
    text: result?.text || '',
    blocks: Array.isArray(result?.blocks) ? result.blocks : []
  };
}
