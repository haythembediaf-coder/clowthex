import { type ReactNode, useState } from "react";
import {
  Package,
  Settings as SettingsIcon,
  Moon,
  Sun,
  ShoppingCart,
  BarChart3,
} from "lucide-react";
import logo from "@/assets/clowthex-logo.png";
import { cn } from "@/lib/utils";
import { useApp } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { InventoryPage } from "@/pages/InventoryPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { POSPage } from "@/pages/POSPage";
import { ReportsPage } from "@/pages/ReportsPage";
import { motion, AnimatePresence } from "framer-motion";

type Tab = "inventory" | "pos" | "reports" | "settings";

export function AppShell() {
  const { t, theme, setTheme } = useApp();
  const [tab, setTab] = useState<Tab>("inventory");

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60">
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
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full pb-24">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {tab === "inventory" && <InventoryPage />}
            {tab === "pos" && <POSPage />}
            {tab === "reports" && <ReportsPage />}
            {tab === "settings" && <SettingsPage />}
          </motion.div>
        </AnimatePresence>
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

function NavButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center gap-1 py-3 transition-smooth relative",
        active ? "text-gold" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {active && (
        <motion.span
          layoutId="nav-pill"
          className="absolute top-0 inset-x-6 h-0.5 bg-gradient-gold rounded-full"
        />
      )}
      {icon}
      <span className="text-[11px] font-medium">{label}</span>
    </button>
  );
}
