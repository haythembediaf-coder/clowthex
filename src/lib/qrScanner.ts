import jsQR from "jsqr";

export interface ScannerHandle {
  stop: () => void;
}

export type ScannerOpts = {
  video: HTMLVideoElement;
  onResult: (value: string) => void;
  signal: { cancelled: boolean };
};

/**
 * Attach a stream to a <video> element and run a continuous decode loop.
 * Uses the native BarcodeDetector when available, otherwise falls back to jsQR.
 * The video element is reused — never replaced — so it never goes black.
 */
export async function attachScanner(
  stream: MediaStream,
  opts: ScannerOpts,
): Promise<ScannerHandle> {
  const { video, onResult, signal } = opts;

  video.setAttribute("playsinline", "true");
  video.muted = true;
  video.autoplay = true;
  (video as any).srcObject = stream;
  // Make sure metadata is loaded before decoding.
  await new Promise<void>((resolve) => {
    if (video.readyState >= 2) return resolve();
    const handler = () => {
      video.removeEventListener("loadedmetadata", handler);
      resolve();
    };
    video.addEventListener("loadedmetadata", handler);
  });
  try {
    await video.play();
  } catch {
    /* autoplay restrictions — will retry below */
  }

  // Try to enable continuous autofocus / auto-exposure for sharper frames.
  try {
    const track = stream.getVideoTracks()[0];
    const caps: any = track?.getCapabilities?.() || {};
    const advanced: any[] = [];
    if (caps.focusMode?.includes?.("continuous")) advanced.push({ focusMode: "continuous" });
    if (caps.exposureMode?.includes?.("continuous")) advanced.push({ exposureMode: "continuous" });
    if (caps.whiteBalanceMode?.includes?.("continuous")) advanced.push({ whiteBalanceMode: "continuous" });
    if (advanced.length) await track.applyConstraints({ advanced } as any);
  } catch { /* not supported, that's fine */ }

  const BD: any = (typeof window !== "undefined" && (window as any).BarcodeDetector) || null;
  let detector: any = null;
  if (BD) {
    try {
      const formats: string[] = await BD.getSupportedFormats();
      const wanted = ["qr_code", "ean_13", "ean_8", "code_128", "code_39", "upc_a", "upc_e", "itf"]
        .filter((f) => formats.includes(f));
      if (wanted.length > 0) detector = new BD({ formats: wanted });
    } catch {
      detector = null;
    }
  }

  // jsQR fallback canvas
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });

  let stopped = false;
  let delivered = false;
  let raf = 0;
  let lastDecode = 0;
  const DECODE_INTERVAL_MS = 60; // ~16 fps decode

  const deliver = (value: string) => {
    if (delivered || signal.cancelled) return;
    delivered = true;
    stopped = true;
    onResult(value);
  };

  const decodeOnce = async () => {
    if (signal.cancelled || stopped) return;
    if (video.readyState < 2) return;
    try {
      if (detector) {
        const codes = await detector.detect(video);
        if (codes && codes.length > 0 && codes[0].rawValue) {
          deliver(String(codes[0].rawValue));
          return;
        }
      } else if (ctx) {
        const vw = video.videoWidth;
        const vh = video.videoHeight;
        if (vw && vh) {
          // Crop a centered square ROI (the visible scan window) — much faster than a full frame.
          const side = Math.min(vw, vh);
          const sx = (vw - side) >> 1;
          const sy = (vh - side) >> 1;
          const target = 400; // jsQR is plenty accurate at this size and ~3-4× faster than 720p.
          const scale = Math.min(1, target / side);
          const w = Math.max(1, Math.round(side * scale));
          const h = w;
          if (canvas.width !== w) canvas.width = w;
          if (canvas.height !== h) canvas.height = h;
          ctx.drawImage(video, sx, sy, side, side, 0, 0, w, h);
          const img = ctx.getImageData(0, 0, w, h);
          const code = jsQR(img.data, w, h, { inversionAttempts: "attemptBoth" });
          if (code && code.data) {
            deliver(code.data);
            return;
          }
        }
      }
    } catch {
      /* ignore one bad frame */
    }
  };

  // Prefer requestVideoFrameCallback when available — perfectly synced with camera frames.
  const rvfc = (video as any).requestVideoFrameCallback?.bind(video);
  if (rvfc) {
    const onFrame = async (now: number) => {
      if (signal.cancelled || stopped) return;
      if (now - lastDecode >= DECODE_INTERVAL_MS) {
        lastDecode = now;
        await decodeOnce();
      }
      if (!stopped && !signal.cancelled) {
        (video as any).requestVideoFrameCallback?.(onFrame);
      }
    };
    (video as any).requestVideoFrameCallback?.(onFrame);
  } else {
    const tick = async (now: number) => {
      if (signal.cancelled || stopped) return;
      if (now - lastDecode >= DECODE_INTERVAL_MS) {
        lastDecode = now;
        await decodeOnce();
      }
      if (!stopped && !signal.cancelled) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  }

  return {
    stop: () => {
      stopped = true;
      if (raf) cancelAnimationFrame(raf);
      try {
        stream.getTracks().forEach((t) => t.stop());
      } catch {
        /* ignore */
      }
      try {
        (video as any).srcObject = null;
      } catch {
        /* ignore */
      }
    },
  };
}

/**
 * Open the rear camera at the highest resolution it actually supports.
 * Must be called directly inside a user-gesture handler.
 */
export async function openRearCamera(): Promise<MediaStream> {
  // 1080p is the sweet spot for QR/barcode scanning on phones:
  // sharp enough to read tiny codes, light enough to decode in real time.
  // We fall back to 720p, then to whatever the device offers.
  const tiers: MediaTrackConstraints[] = [
    {
      facingMode: { ideal: "environment" },
      width: { ideal: 1920 },
      height: { ideal: 1080 },
      frameRate: { ideal: 30, max: 60 },
    },
    {
      facingMode: { ideal: "environment" },
      width: { ideal: 1280 },
      height: { ideal: 720 },
      frameRate: { ideal: 30 },
    },
    { facingMode: { ideal: "environment" } },
    { },
  ];
  let lastErr: unknown = new Error("no-camera");
  for (const v of tiers) {
    try {
      return await navigator.mediaDevices.getUserMedia({
        video: Object.keys(v).length ? v : true,
        audio: false,
      });
    } catch (e: any) {
      lastErr = e;
      // Permission denied is terminal — don't keep retrying.
      if (e?.name === "NotAllowedError" || e?.name === "SecurityError") throw e;
    }
  }
  throw lastErr;
}