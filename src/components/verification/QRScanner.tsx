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

        await html5QrCode.start(
          { facingMode: 'environment' }, // Use back camera on mobile
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
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
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Scan QR Code
            </h3>
            <Button variant="ghost" size="icon" onClick={handleClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          )}

          <div className="relative">
            <div
              id="qr-reader"
              ref={containerRef}
              className="w-full rounded-lg overflow-hidden bg-black"
              style={{ minHeight: '300px' }}
            />
            {!isScanning && !error && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <Loader2 className="h-8 w-8 animate-spin text-white" />
              </div>
            )}
          </div>

          <p className="mt-4 text-sm text-muted-foreground text-center">
            Point your camera at the QR code
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
