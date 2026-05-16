import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useApp } from "@/contexts/AppContext";
import { Camera, ExternalLink } from "lucide-react";
import { attachScanner, openRearCamera, type ScannerHandle } from "@/lib/qrScanner";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onDetected: (code: string) => void;
}

export function BarcodeScanner({ open, onOpenChange, onDetected }: Props) {
  const { t } = useApp();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const handleRef = useRef<ScannerHandle | null>(null);
  const cancelRef = useRef({ cancelled: false });
  const [error, setError] = useState<string | null>(null);
  const [needsOpenNewTab, setNeedsOpenNewTab] = useState(false);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setNeedsOpenNewTab(false);
    setScanning(false);
    cancelRef.current = { cancelled: false };

    let localStream: MediaStream | null = null;

    const start = async () => {
      try {
        localStream = await openRearCamera();
      } catch (e: any) {
        const inIframe = window.self !== window.top;
        setError(t.scanner.permissionDenied);
        if (inIframe) setNeedsOpenNewTab(true);
        return;
      }
      // Wait for the <video> element to mount inside the dialog.
      for (let i = 0; i < 30 && !videoRef.current; i++) {
        await new Promise((r) => requestAnimationFrame(() => r(null)));
      }
      if (cancelRef.current.cancelled || !videoRef.current) {
        localStream.getTracks().forEach((t) => t.stop());
        return;
      }
      try {
        handleRef.current = await attachScanner(localStream, {
          video: videoRef.current,
          onResult: (value) => {
            onDetected(value);
            onOpenChange(false);
          },
          signal: cancelRef.current,
        });
        setScanning(true);
      } catch {
        localStream.getTracks().forEach((t) => t.stop());
        setError(t.scanner.permissionDenied);
      }
    };

    start();

    return () => {
      cancelRef.current.cancelled = true;
      handleRef.current?.stop();
      handleRef.current = null;
      if (localStream) {
        try { localStream.getTracks().forEach((t) => t.stop()); } catch { /* ignore */ }
      }
    };
  }, [open, onDetected, onOpenChange, t.scanner.permissionDenied]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="w-4 h-4" /> {t.scanner.title}
          </DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">{t.scanner.hint}</p>

        <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-black border border-gold/20">
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className="absolute inset-0 w-full h-full object-cover"
          />
          {/* Corner brackets */}
          <div className="pointer-events-none absolute inset-4">
            <span className="absolute top-0 left-0 w-7 h-7 border-t-4 border-l-4 border-yellow-400 rounded-tl-lg" />
            <span className="absolute top-0 right-0 w-7 h-7 border-t-4 border-r-4 border-yellow-400 rounded-tr-lg" />
            <span className="absolute bottom-0 left-0 w-7 h-7 border-b-4 border-l-4 border-green-500 rounded-bl-lg" />
            <span className="absolute bottom-0 right-0 w-7 h-7 border-b-4 border-r-4 border-red-500 rounded-br-lg" />
            {scanning && (
              <span
                className="ssm-scan-line absolute top-0 left-2 right-2 h-[2px] bg-gradient-to-r from-transparent via-gold to-transparent"
                style={{
                  ["--scan-distance" as any]: "calc(100% - 4px)",
                  boxShadow: "0 0 12px 2px hsl(var(--gold))",
                }}
              />
            )}
          </div>
        </div>

        {error && <p className="text-sm text-destructive text-center">{error}</p>}
        {needsOpenNewTab && (
          <Button
            variant="gold"
            onClick={() => window.open(window.location.href, "_blank")}
          >
            <ExternalLink className="w-4 h-4" />
            فتح في نافذة جديدة لتفعيل الكاميرا
          </Button>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t.scanner.cancel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
