import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Button } from '@/components/ui/button';
import { X, Camera, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface QRScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onClose: () => void;
}

export function QRScanner({ onScanSuccess, onClose }: QRScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const startScanning = async () => {
      try {
        const html5QrCode = new Html5Qrcode('qr-reader');
        scannerRef.current = html5QrCode;

        // Mobile-optimized QR box size
        const isMobile = window.innerWidth < 768;
        const qrboxSize = isMobile ? Math.min(window.innerWidth * 0.8, 300) : 250;
        
        await html5QrCode.start(
          { facingMode: 'environment' }, // Use back camera on mobile
          {
            fps: 10,
            qrbox: { width: qrboxSize, height: qrboxSize },
            aspectRatio: 1.0,
            videoConstraints: {
              facingMode: 'environment',
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
          },
          (decodedText) => {
            // Success callback
            onScanSuccess(decodedText);
            stopScanning();
          },
          () => {
            // Error callback - ignore most errors, they're just scanning attempts
          }
        );

        setIsScanning(true);
        setError(null);
      } catch (err: any) {
        console.error('Error starting QR scanner:', err);
        setError(err.message || 'Failed to start camera. Please ensure camera permissions are granted.');
        setIsScanning(false);
      }
    };

    startScanning();

    return () => {
      stopScanning();
    };
  }, [onScanSuccess]);

  const stopScanning = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (err) {
        // Ignore errors when stopping
      }
      scannerRef.current = null;
    }
    setIsScanning(false);
  };

  const handleClose = () => {
    stopScanning();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center p-0 sm:p-4">
      <div className="w-full h-full sm:w-full sm:max-w-md sm:h-auto flex flex-col">
        {/* Mobile header */}
        <div className="flex items-center justify-between p-4 bg-black/90 sm:bg-transparent">
          <h3 className="text-lg font-semibold flex items-center gap-2 text-white sm:text-foreground">
            <Camera className="h-5 w-5" />
            Scan QR Code
          </h3>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleClose}
            className="min-h-[44px] min-w-[44px] text-white hover:bg-white/20 sm:text-foreground sm:hover:bg-accent"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {error && (
          <div className="mx-4 mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
            {error}
          </div>
        )}

        {/* Scanner container - full screen on mobile */}
        <div className="relative flex-1 w-full flex items-center justify-center bg-black">
          <div
            id="qr-reader"
            ref={containerRef}
            className="w-full h-full sm:rounded-lg overflow-hidden bg-black"
            style={{ 
              minHeight: '100%',
              maxHeight: '100vh'
            }}
          />
          {!isScanning && !error && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <Loader2 className="h-8 w-8 animate-spin text-white" />
            </div>
          )}
        </div>

        <p className="p-4 text-sm text-muted-foreground text-center bg-black/90 sm:bg-transparent text-white sm:text-muted-foreground">
          Point your camera at the QR code
        </p>
      </div>
    </div>
  );
}
