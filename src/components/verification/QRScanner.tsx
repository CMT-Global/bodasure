import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Button } from '@/components/ui/button';
import { X, Camera, Loader2, RefreshCw, AlertCircle } from 'lucide-react';

interface QRScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onClose: () => void;
}

export function QRScanner({ onScanSuccess, onClose }: QRScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const getErrorMessage = (err: any): string => {
    const errorMessage = err?.message || err?.toString() || '';
    
    // Check for common camera permission errors
    if (errorMessage.includes('Permission denied') || 
        errorMessage.includes('NotAllowedError') ||
        errorMessage.includes('permission')) {
      return 'Camera permission denied. Please enable camera access in your browser settings and try again.';
    }
    
    if (errorMessage.includes('NotFoundError') || errorMessage.includes('no camera')) {
      return 'No camera found. Please ensure your device has a camera and try again.';
    }
    
    if (errorMessage.includes('NotReadableError') || errorMessage.includes('in use')) {
      return 'Camera is already in use by another application. Please close other apps using the camera and try again.';
    }
    
    return errorMessage || 'Failed to start camera. Please check your camera permissions and try again.';
  };

  const startScanning = async () => {
    try {
      // Clean up any existing scanner
      if (scannerRef.current) {
        try {
          await scannerRef.current.stop();
          scannerRef.current.clear();
        } catch (e) {
          // Ignore cleanup errors
        }
      }

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
      setIsRetrying(false);
    } catch (err: any) {
      console.error('Error starting QR scanner:', err);
      setError(getErrorMessage(err));
      setIsScanning(false);
      setIsRetrying(false);
    }
  };

  const handleRetry = async () => {
    setIsRetrying(true);
    setError(null);
    await new Promise(resolve => setTimeout(resolve, 500)); // Brief delay before retry
    await startScanning();
  };

  useEffect(() => {
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
          <div className="mx-4 mb-4 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-destructive text-sm font-medium mb-2">Camera Error</p>
                <p className="text-destructive/90 text-sm mb-3">{error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRetry}
                  disabled={isRetrying}
                  className="min-h-[44px] w-full sm:w-auto"
                >
                  {isRetrying ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Retrying...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Retry
                    </>
                  )}
                </Button>
              </div>
            </div>
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
