import { useState, useRef, useCallback, useEffect } from 'react';

// Minimal QR decoder using canvas pixel analysis
// Integrates with jsQR if available, otherwise provides a stub that
// indicates manual input is needed.

async function decodeFrameFromCanvas(canvas) {
  const ctx = canvas.getContext('2d');
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  // Try to use jsQR if it's been loaded globally
  if (typeof window !== 'undefined' && window.jsQR) {
    const result = window.jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'dontInvert',
    });
    if (result) return result.data;
  }

  // Return null if no decoder available — caller should handle
  return null;
}

export function useQRScanner() {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const stopScan = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (mountedRef.current) {
      setScanning(false);
    }
  }, []);

  const tick = useCallback(async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      if (mountedRef.current && scanning) {
        rafRef.current = requestAnimationFrame(tick);
      }
      return;
    }

    canvas.height = video.videoHeight;
    canvas.width = video.videoWidth;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    try {
      const decoded = await decodeFrameFromCanvas(canvas);
      if (decoded && mountedRef.current) {
        setResult(decoded);
        stopScan();
        return;
      }
    } catch {
      // continue scanning on decode errors
    }

    if (mountedRef.current && scanning) {
      rafRef.current = requestAnimationFrame(tick);
    }
  }, [scanning, stopScan]);

  const startScan = useCallback(async (videoElement = null, canvasElement = null) => {
    setError(null);
    setResult(null);

    if (videoElement) videoRef.current = videoElement;
    if (canvasElement) canvasRef.current = canvasElement;

    if (!videoRef.current || !canvasRef.current) {
      setError('Video and canvas elements are required. Pass them as arguments or set videoRef/canvasRef.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      videoRef.current.setAttribute('playsinline', 'true');
      await videoRef.current.play();
      setScanning(true);
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        setError('Camera access denied. Please allow camera permissions and try again.');
      } else if (err.name === 'NotFoundError') {
        setError('No camera found on this device.');
      } else {
        setError(`Camera error: ${err.message}`);
      }
      setScanning(false);
    }
  }, []);

  // Start the animation loop when scanning becomes true
  useEffect(() => {
    if (scanning) {
      rafRef.current = requestAnimationFrame(tick);
    }
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [scanning, tick]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopScan();
    };
  }, [stopScan]);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return {
    scanning,
    startScan,
    stopScan,
    result,
    error,
    reset,
    videoRef,
    canvasRef,
  };
}

export default useQRScanner;
