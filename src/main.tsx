import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

async function init() {
  // Disable all passive listeners for touch
  document.addEventListener("touchmove", () => {}, { passive: true });
  document.addEventListener("touchstart", () => {}, { passive: false });
  document.addEventListener("touchend", () => {}, { passive: false });
  document.addEventListener("click", () => {}, { passive: false });
  
  // Fix for Android button issues
  const root = document.getElementById("root");
  if (root) {
    root.style.width = "100%";
    root.style.height = "100%";
    root.style.display = "flex";
    root.style.flexDirection = "column";
    root.style.touchAction = "manipulation";
  }
  
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
    createRoot(root!).render(<App />);
    // Hide splash after React renders
    setTimeout(() => {
      SplashScreen.hide({ fadeOutDuration: 300 }).catch(() => {});
    }, 100);
  } else {
    createRoot(root!).render(<App />);
  }
}

init();
