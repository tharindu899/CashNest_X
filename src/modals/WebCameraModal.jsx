import { useEffect, useRef, useState } from 'react';

export default function WebCameraModal({ open, close, onCapture }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    async function start() {
      setError('');
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 1920 } },
          audio: false
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch (err) {
        setError('Camera permission blocked or unavailable. Use Pick Photo instead.');
      }
    }
    start();
    return () => {
      cancelled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, [open]);

  function capture() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
    onCapture?.({ dataUrl, fileName: `receipt-${Date.now()}.jpg`, lastModified: Date.now() });
    close?.();
  }

  if (!open) return null;
  return (
    <div className="camera-overlay">
      <div className="camera-topbar">
        <button onClick={close}><i className="ti ti-x" /></button>
        <b>Scan Receipt</b>
        <span />
      </div>
      <div className="camera-preview-wrap">
        {error ? <div className="camera-error"><i className="ti ti-camera-off" /><span>{error}</span></div> : <video ref={videoRef} playsInline muted className="camera-preview" />}
        <div className="receipt-frame" />
      </div>
      <div className="camera-actions">
        <button className="secondary-btn" onClick={close}>Cancel</button>
        <button className="save-btn" onClick={capture} disabled={!!error}>Capture</button>
      </div>
    </div>
  );
}
