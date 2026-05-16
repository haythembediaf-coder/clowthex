import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.haythemgroup.clowthex",
  appName: "ClowtheX",
  webDir: "dist",
  android: {
    backgroundColor: "#0f0f0f",
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: false,
      backgroundColor: "#0f0f0f",
      showSpinner: false,
    },
    StatusBar: {
      style: "Dark",
      backgroundColor: "#0f0f0f",
      overlaysWebView: false,
    },
    Keyboard: {
      resize: "body",
      style: "dark",
      resizeOnFullScreen: true,
    },
  },
};

export default config;
