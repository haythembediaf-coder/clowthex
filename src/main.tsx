import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

async function init() {
  // Fix touch event handling on Android/iOS
  document.addEventListener("touchmove", () => {}, { passive: true });
  
  const { Capacitor } = await import("@capacitor/core");
  if (Capacitor.isNativePlatform()) {
    const { SplashScreen } = await import("@capacitor/splash-screen");
    const { StatusBar, Style } = await import("@capacitor/status-bar");
    try {
      await StatusBar.setStyle({ style: Style.Dark });
      await StatusBar.setBackgroundColor({ color: "#0f0f0f" });
    } catch {
      // ignore on devices that don't support it
    }
    createRoot(document.getElementById("root")!).render(<App />);
    // Hide splash after React renders
    setTimeout(() => {
      SplashScreen.hide({ fadeOutDuration: 300 }).catch(() => {});
    }, 100);
  } else {
    createRoot(document.getElementById("root")!).render(<App />);
  }
}

init();
