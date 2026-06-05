import { Capacitor, registerPlugin } from '@capacitor/core';

const NativeExport = registerPlugin('NativeExport');

export async function openExportTarget(extra = {}) {
  if (!Capacitor.isNativePlatform()) return false;

  const fileUri = extra.fileUri || extra.uri || '';
  const filePath = extra.filePath || extra.path || '';
  const fileName = extra.fileName || extra.filename || '';
  const mimeType = extra.mimeType || 'application/octet-stream';

  try {
    if (fileUri || filePath || fileName) {
      await NativeExport.openFile({ uri: fileUri, path: filePath, fileName, mimeType });
      return true;
    }
  } catch (error) {
    console.warn('Could not open exported file, opening Documents folder:', error);
  }

  try {
    await NativeExport.openDownloadsFolder({ directory: 'Documents', folder: 'CashNest X' });
    return true;
  } catch (error) {
    console.warn('Could not open Documents folder:', error);
    return false;
  }
}
