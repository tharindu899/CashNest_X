import { Capacitor } from '@capacitor/core';
import { scanReceiptWithNativeMlKit } from '../services/receiptOcrNative';
export { parseReceiptText, normaliseReceiptText, pickReceiptAmount, pickReceiptDate, pickReceiptMerchant, guessReceiptCategory } from '../services/receiptParser';
import { parseReceiptText } from '../services/receiptParser';

export async function scanReceiptImage(imageDataUrl, fileName = '', onProgress = () => {}) {
  onProgress({ status: 'Starting Google ML Kit scanner…', progress: 8 });

  if (!Capacitor.isNativePlatform()) {
    throw new Error('Google ML Kit receipt scanner works inside the Android APK. Web preview can attach photo only.');
  }

  onProgress({ status: 'Reading text with Google ML Kit…', progress: 35 });
  const result = await scanReceiptWithNativeMlKit({ imageDataUrl, fileName });
  onProgress({ status: 'Finding amount, date and shop name…', progress: 78 });
  const details = parseReceiptText(result.text || '', fileName);
  onProgress({ status: 'Receipt ready for review…', progress: 100 });
  return { ...details, blocks: result.blocks || [] };
}
