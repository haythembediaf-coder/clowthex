import { forwardRef, useState, type ReactNode } from "react";
import {
  Package,
  Settings as SettingsIcon,
  Moon,
  Sun,
  ShoppingCart,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import logo from "@/assets/clowthex-logo.png";
import { useApp } from "@/contexts/AppContext";
import { InventoryPage } from "@/pages/InventoryPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { POSPage } from "@/pages/POSPage";
import { ReportsPage } from "@/pages/ReportsPage";

type Tab = "inventory" | "pos" | "reports" | "settings";

export function AppShell() {
  const { t, theme, setTheme } = useApp();
  const [tab, setTab] = useState<Tab>("inventory");

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-card/80 backdrop-blur">
        <div className="flex items-center justify-between px-4 h-14 max-w-3xl mx-auto w-full">
          <div className="flex items-center gap-2.5">
            <img
              src={logo}
              alt="ClowtheX"
              className="w-9 h-9 rounded-lg shadow-gold object-cover"
            />
            <div className="leading-tight">
              <h1 className="text-sm font-bold text-foreground">{t.appName}</h1>
              <p className="text-[10px] text-muted-foreground">{t.appTagline}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="flex items-center justify-center w-10 h-10 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
            aria-label="Toggle theme"
            style={{ WebkitUserSelect: "none", WebkitTouchCallout: "none" }}
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {tab !== "settings" && (
        <div className="mx-4 md:mx-0 mt-4">
          <div className="rounded-2xl border border-dashed border-border bg-secondary/80 p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">{t.settings.backup}</p>
              <p className="text-xs text-muted-foreground">
                اضغط زر الإعدادات للوصول إلى استيراد وتصدير البيانات.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setTab("settings")}>{t.nav.settings}</Button>
          </div>
        </div>
      )}

      <main className="flex-1 max-w-3xl mx-auto w-full pb-24">
        {tab === "inventory" && <InventoryPage />}
        {tab === "pos" && <POSPage />}
        {tab === "reports" && <ReportsPage />}
        {tab === "settings" && <SettingsPage />}
      </main>

      <nav className="fixed bottom-0 inset-x-0 z-30 border-t border-border bg-card/95 backdrop-blur">
        <div className="max-w-3xl mx-auto grid grid-cols-4">
          <NavButton
            active={tab === "inventory"}
            onClick={() => setTab("inventory")}
            icon={<Package className="w-5 h-5" />}
            label={t.nav.inventory}
          />
          <NavButton
            active={tab === "pos"}
            onClick={() => setTab("pos")}
            icon={<ShoppingCart className="w-5 h-5" />}
            label={t.nav.pos}
          />
          <NavButton
            active={tab === "reports"}
            onClick={() => setTab("reports")}
            icon={<BarChart3 className="w-5 h-5" />}
            label={t.nav.reports}
          />
          <NavButton
            active={tab === "settings"}
            onClick={() => setTab("settings")}
            icon={<SettingsIcon className="w-5 h-5" />}
            label={t.nav.settings}
          />
        </div>
      </nav>
    </div>
  );
}

interface NavButtonProps {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
}

const NavButton = forwardRef<HTMLButtonElement, NavButtonProps>(
  ({ active, onClick, icon, label }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        onClick={onClick}
        className={`flex flex-col items-center justify-center gap-1 py-3 transition-all cursor-pointer w-full h-full relative ${
          active ? "text-gold" : "text-muted-foreground hover:text-foreground"
        }`}
        style={{ WebkitUserSelect: "none", WebkitTouchCallout: "none" }}
      >
        {icon}
        <span className="text-[11px] font-medium">{label}</span>
        {active && <div className="absolute top-0 h-0.5 bg-gradient-to-r from-transparent via-gold to-transparent w-full" />}
      </button>
    );
  }
);

NavButton.displayName = "NavButton";
