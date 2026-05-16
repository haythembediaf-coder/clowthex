import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  KeyRound,
  Loader2,
  CheckCircle2,
  ArrowLeft,
  ScanLine,
  X,
  ExternalLink,
} from "lucide-react";
import logo from "@/assets/clowthex-logo.png";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useApp } from "@/contexts/AppContext";
import { toast } from "sonner";
import { attachScanner, openRearCamera, type ScannerHandle } from "@/lib/qrScanner";

const ACTIVATION_CODE = "haythemgroupBdf(16062002)";

interface Props {
  onActivated: () => void;
}

type Step = "qr" | "password";

export function ActivationScreen({ onActivated }: Props) {
  const { t } = useApp();
  const [step, setStep] = useState<Step>("qr");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [needsOpenNewTab, setNeedsOpenNewTab] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const handleRef = useRef<ScannerHandle | null>(null);
  const cancelRef = useRef({ cancelled: false });

  const stopScan = () => {
    cancelRef.current.cancelled = true;
    handleRef.current?.stop();
    handleRef.current = null;
    setScanning(false);
  };

  const verify = (decoded: string) => {
    if (decoded.trim() === ACTIVATION_CODE) {
      stopScan();
      toast.success(t.activation.qrVerified);
      setStep("password");
    } else {
      toast.error(t.activation.qrInvalid);
    }
  };

  const startScan = async () => {
    setScanError(null);
    setNeedsOpenNewTab(false);
    cancelRef.current = { cancelled: false };

    let stream: MediaStream;
    try {
      // CRITICAL: call getUserMedia first thing in the gesture chain.
      stream = await openRearCamera();
    } catch (e: any) {
      const inIframe = window.self !== window.top;
      setScanError(t.scanner.permissionDenied);
      if (inIframe) setNeedsOpenNewTab(true);
      return;
    }

    setScanning(true);
    // Wait one tick so the <video> mounts.
    await new Promise((r) => requestAnimationFrame(() => r(null)));
    const video = videoRef.current;
    if (!video) {
      stream.getTracks().forEach((t) => t.stop());
      setScanning(false);
      return;
    }
    try {
      handleRef.current = await attachScanner(stream, {
        video,
        onResult: verify,
        signal: cancelRef.current,
      });
    } catch {
      stream.getTracks().forEach((t) => t.stop());
      setScanError(t.scanner.permissionDenied);
      setScanning(false);
    }
  };

  useEffect(() => {
    return () => {
      cancelRef.current.cancelled = true;
      handleRef.current?.stop();
    };
  }, []);

  const submitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await new Promise((r) => setTimeout(r, 400));
    if (password.trim() === ACTIVATION_CODE) {
      localStorage.setItem("ssm_activated", "1");
      toast.success(t.activation.success);
      onActivated();
    } else {
      toast.error(t.activation.invalid);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-luxe p-6">
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-md"
      >
        <div className="bg-card/95 backdrop-blur border border-gold/20 rounded-2xl p-8 shadow-gold">
          <motion.img
            src={logo}
            alt="ClowtheX"
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="w-20 h-20 mx-auto mb-6 rounded-2xl shadow-gold object-cover"
          />

          <h1 className="text-2xl font-bold text-center mb-2 text-foreground">
            {t.appName}
          </h1>
          <p className="text-sm text-center text-muted-foreground mb-6">
            {t.activation.subtitle}
          </p>

          <div className="flex items-center justify-center gap-2 mb-6">
            <div className={`flex items-center gap-2 ${step === "qr" ? "text-gold" : "text-muted-foreground"}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border ${step === "qr" ? "border-gold bg-gold/10" : "border-gold/40 bg-gold/5"}`}>
                {step === "password" ? <CheckCircle2 className="w-4 h-4 text-gold" /> : "1"}
              </div>
            </div>
            <div className="w-10 h-px bg-border" />
            <div className={`flex items-center gap-2 ${step === "password" ? "text-gold" : "text-muted-foreground"}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border ${step === "password" ? "border-gold bg-gold/10" : "border-border"}`}>
                2
              </div>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {step === "qr" ? (
              <motion.div
                key="qr"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
                className="space-y-4"
              >
                <p className="text-sm text-center font-medium text-foreground">
                  {t.activation.step1}
                </p>

                <div className="relative mx-auto w-full aspect-square max-w-xs rounded-2xl overflow-hidden bg-black border border-gold/20">
                  {/* Stable video element — never replaced. */}
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    autoPlay
                    className="absolute inset-0 w-full h-full object-cover"
                    style={{ display: scanning ? "block" : "none" }}
                  />

                  {!scanning && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/60">
                      <ScanLine className="w-10 h-10 text-gold" />
                      <p className="text-xs px-4 text-center text-white/80">
                        {t.activation.scanHint}
                      </p>
                    </div>
                  )}

                  <div className="pointer-events-none absolute inset-6">
                    <span className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-yellow-400 rounded-tl-lg" />
                    <span className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-yellow-400 rounded-tr-lg" />
                    <span className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-green-500 rounded-bl-lg" />
                    <span className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-red-500 rounded-br-lg" />

                    {scanning && (
                      <span
                        className="ssm-scan-line absolute top-0 left-2 right-2 h-[2px] bg-gradient-to-r from-transparent via-gold to-transparent"
                        style={{
                          // The viewport is square (max-w-xs ≈ 320px → minus inset 6*2*4 = 48 → ~272px scan distance)
                          // Use percentage instead so it adapts to actual size.
                          ["--scan-distance" as any]: "calc(100% - 4px)",
                          boxShadow: "0 0 12px 2px hsl(var(--gold))",
                        }}
                      />
                    )}
                  </div>
                </div>

                {scanError && (
                  <p className="text-xs text-center text-destructive">
                    {scanError}
                  </p>
                )}

                {needsOpenNewTab && (
                  <Button
                    type="button"
                    variant="gold"
                    size="sm"
                    className="w-full"
                    onClick={() => window.open(window.location.href, "_blank")}
                  >
                    <ExternalLink className="w-4 h-4" />
                    فتح في نافذة جديدة لتفعيل الكاميرا
                  </Button>
                )}

                {!scanning ? (
                  <Button
                    type="button"
                    variant="gold"
                    size="lg"
                    className="w-full"
                    onClick={startScan}
                  >
                    <ScanLine className="w-4 h-4" />
                    {t.activation.startScan}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    className="w-full"
                    onClick={stopScan}
                  >
                    <X className="w-4 h-4" />
                    {t.scanner.cancel}
                  </Button>
                )}
              </motion.div>
            ) : (
              <motion.form
                key="pw"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
                onSubmit={submitPassword}
                className="space-y-4"
              >
                <p className="text-sm text-center font-medium text-foreground">
                  {t.activation.step2}
                </p>
                <div className="relative">
                  <KeyRound className="absolute top-1/2 -translate-y-1/2 start-3 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t.activation.passwordPlaceholder}
                    className="ps-10 h-12 bg-background/50"
                    autoFocus
                    disabled={loading}
                  />
                </div>
                <Button
                  type="submit"
                  variant="gold"
                  size="lg"
                  className="w-full"
                  disabled={loading || !password.trim()}
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : t.activation.button}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    setPassword("");
                    setStep("qr");
                  }}
                  disabled={loading}
                >
                  <ArrowLeft className="w-4 h-4" />
                  {t.activation.back}
                </Button>
              </motion.form>
            )}
          </AnimatePresence>
        </div>

        <p className="text-center text-xs text-muted-foreground/60 mt-6">
          © Haythem Group
        </p>
      </motion.div>
    </div>
  );
}
