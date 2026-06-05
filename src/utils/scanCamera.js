import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

export async function captureReceiptPhoto() {
  if (!Capacitor.isNativePlatform()) return null;
  const photo = await Camera.getPhoto({
    source: CameraSource.Camera,
    resultType: CameraResultType.DataUrl,
    quality: 86,
    correctOrientation: true,
    allowEditing: false,
    promptLabelHeader: 'Scan Receipt',
    promptLabelPhoto: 'Take Photo',
    promptLabelPicture: 'Camera'
  });
  if (!photo?.dataUrl) return null;
  return {
    dataUrl: photo.dataUrl,
    fileName: `receipt-${Date.now()}.${photo.format || 'jpg'}`,
    lastModified: Date.now()
  };
}

export function dataUrlToReceiptFile(dataUrl, fileName = 'receipt.jpg', lastModified = Date.now()) {
  return {
    name: fileName,
    lastModified,
    dataUrl
  };
}


export function canUseWebCamera() {
  return !!(navigator?.mediaDevices?.getUserMedia);
}
