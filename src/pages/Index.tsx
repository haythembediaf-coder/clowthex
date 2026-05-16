import { useEffect, useState } from "react";
import { ActivationScreen } from "@/components/ActivationScreen";
import { AppShell } from "@/components/AppShell";
import { useApp } from "@/contexts/AppContext";

const Index = () => {
  const { isReady } = useApp();
  const [activated, setActivated] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const params = new URLSearchParams(window.location.search);
    if (params.get("wipe") === "1") {
      try {
        localStorage.clear();
        sessionStorage.clear();
        indexedDB.deleteDatabase("style-stock-manager");
      } catch {
        /* ignore */
      }
      return false;
    }
    if (params.get("reset") === "1") {
      localStorage.removeItem("ssm_activated");
      return false;
    }
    return localStorage.getItem("ssm_activated") === "1";
  });

  useEffect(() => {
    document.title = "ClowtheX - إدارة محل الملابس";
  }, []);

  if (!isReady) {
    return <div className="min-h-screen bg-background" />;
  }

  if (!activated) {
    return <ActivationScreen onActivated={() => setActivated(true)} />;
  }

  return <AppShell />;
};

export default Index;
