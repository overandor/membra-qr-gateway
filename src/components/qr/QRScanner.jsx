import React, { useRef, useCallback } from 'react';
import { Camera, CameraOff, RotateCcw, CheckCircle, AlertTriangle } from 'lucide-react';
import { cn } from '../../utils';
import { useQRScanner } from '../../hooks/useQRScanner.js';
import { Button } from '../ui/Button.jsx';

export function QRScanner({ onResult, className }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const { scanning, startScan, stopScan, result, error, reset } = useQRScanner();

  const handleStart = useCallback(async () => {
    await startScan(videoRef.current, canvasRef.current);
  }, [startScan]);

  const handleStop = useCallback(() => {
    stopScan();
  }, [stopScan]);

  const handleReset = useCallback(() => {
    reset();
  }, [reset]);

  // Notify parent when result arrives
  React.useEffect(() => {
    if (result && onResult) {
      onResult(result);
    }
  }, [result, onResult]);

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {/* Video preview */}
      <div className="relative rounded-xl overflow-hidden bg-background-100 border border-primary-orange/20"
        style={{ minHeight: 240 }}>
        <video
          ref={videoRef}
          className={cn(
            'w-full h-60 object-cover',
            !scanning && 'opacity-0'
          )}
          playsInline
          muted
        />
        <canvas ref={canvasRef} className="hidden" />

        {!scanning && !result && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <Camera className="w-12 h-12 text-text-muted" />
            <p className="text-sm text-text-muted">Camera preview will appear here</p>
          </div>
        )}

        {/* Scan overlay */}
        {scanning && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-48 h-48 border-2 border-primary-orange rounded-xl relative">
              <span className="absolute top-0 left-0 w-5 h-5 border-t-4 border-l-4 border-primary-orange rounded-tl" />
              <span className="absolute top-0 right-0 w-5 h-5 border-t-4 border-r-4 border-primary-orange rounded-tr" />
              <span className="absolute bottom-0 left-0 w-5 h-5 border-b-4 border-l-4 border-primary-orange rounded-bl" />
              <span className="absolute bottom-0 right-0 w-5 h-5 border-b-4 border-r-4 border-primary-orange rounded-br" />
              {/* Scan line animation */}
              <div
                className="absolute left-2 right-2 h-0.5 bg-primary-orange/70"
                style={{ animation: 'scan-line 2s ease-in-out infinite', top: '50%' }}
              />
            </div>
          </div>
        )}

        {/* Status badge */}
        {scanning && (
          <div className="absolute bottom-3 left-3 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/70 backdrop-blur-sm">
            <span className="w-2 h-2 rounded-full bg-danger animate-pulse" />
            <span className="text-xs text-white">Scanning…</span>
          </div>
        )}
      </div>

      {/* Result */}
      {result && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-success/10 border border-success/30">
          <CheckCircle className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-success mb-1">QR Code Detected</p>
            <p className="text-xs font-mono text-text-primary break-all">{result}</p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-danger/10 border border-danger/30">
          <AlertTriangle className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-danger mb-1">Scanner Error</p>
            <p className="text-xs text-text-muted">{error}</p>
          </div>
        </div>
      )}

      {/* Info note when jsQR isn't loaded */}
      {!result && !error && (
        <div className="p-3 rounded-lg bg-background-100 border border-white/5">
          <p className="text-xs text-text-muted">
            Note: QR decoding requires jsQR to be loaded on the page (window.jsQR). Without it, camera preview works but codes won't be decoded automatically.
          </p>
        </div>
      )}

      {/* Controls */}
      <div className="flex gap-2">
        {!scanning && !result && (
          <Button
            variant="primary"
            size="medium"
            onClick={handleStart}
            icon={Camera}
          >
            Start Scan
          </Button>
        )}

        {scanning && (
          <Button
            variant="danger"
            size="medium"
            onClick={handleStop}
            icon={CameraOff}
          >
            Stop Scan
          </Button>
        )}

        {result && (
          <Button
            variant="secondary"
            size="medium"
            onClick={handleReset}
            icon={RotateCcw}
          >
            Scan Another
          </Button>
        )}
      </div>

      <style>{`
        @keyframes scan-line {
          0%, 100% { transform: translateY(-60px); }
          50% { transform: translateY(60px); }
        }
      `}</style>
    </div>
  );
}

export default QRScanner;
