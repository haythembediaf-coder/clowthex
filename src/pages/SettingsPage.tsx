import { useEffect, useState } from "react";
import {
  Languages,
  Coins,
  Palette,
  Store,
  Save,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useApp } from "@/contexts/AppContext";
import { getSetting, setSetting } from "@/lib/db";
import { toast } from "sonner";
import type { Lang } from "@/i18n/translations";
import type { Currency } from "@/lib/db";

export function SettingsPage() {
  const { t, lang, setLang, theme, setTheme, currency, setCurrency, exchangeRate, setExchangeRate } =
    useApp();

  const [storeName, setStoreName]     = useState("");
  const [storePhone, setStorePhone]   = useState("");
  const [storeAddress, setStoreAddress] = useState("");

  // ── Load store settings ────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const [n, p, a] = await Promise.all([
        getSetting<string>("storeName"),
        getSetting<string>("storePhone"),
        getSetting<string>("storeAddress"),
      ]);
      if (n) setStoreName(n);
      if (p) setStorePhone(p);
      if (a) setStoreAddress(a);
    })();
  }, []);

  const handleSaveStore = async () => {
    await Promise.all([
      setSetting("storeName", storeName),
      setSetting("storePhone", storePhone),
      setSetting("storeAddress", storeAddress),
    ]);
    toast.success(t.settings.saved);
  };

  // ── i18n helpers ──────────────────────────────────────────────────────────
  const i = (ar: string, fr: string, en: string) =>
    lang === "ar" ? ar : lang === "fr" ? fr : en;

  return (
    <div className="px-4 py-5 space-y-5">
      <h2 className="text-xl font-bold">{t.settings.title}</h2>

      {/* ── Language ─────────────────────────────────────────────────────── */}
      <Section icon={<Languages className="w-4 h-4" />}>
        <div>
          <Label className="text-xs">{t.settings.language}</Label>
          <Select value={lang} onValueChange={(v) => setLang(v as Lang)}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ar">العربية</SelectItem>
              <SelectItem value="fr">Français</SelectItem>
              <SelectItem value="en">English</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Section>

      {/* ── Currency ─────────────────────────────────────────────────────── */}
      <Section icon={<Coins className="w-4 h-4" />}>
        <div>
          <Label className="text-xs">{t.settings.currency}</Label>
          <Select value={currency} onValueChange={(v) => setCurrency(v as Currency)}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="DZD">DZD — د.ج</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">{t.settings.exchangeRate}</Label>
          <Input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={exchangeRate}
            onChange={(e) => setExchangeRate(Math.max(0, Number(e.target.value) || 0))}
            className="mt-1"
          />
        </div>
      </Section>

      {/* ── Theme ────────────────────────────────────────────────────────── */}
      <Section icon={<Palette className="w-4 h-4" />}>
        <div>
          <Label className="text-xs">{t.settings.theme}</Label>
          <div className="grid grid-cols-2 gap-2 mt-1">
            <Button variant={theme === "light" ? "gold" : "outline"} onClick={() => setTheme("light")} size="sm">
              {t.settings.themeLight}
            </Button>
            <Button variant={theme === "dark" ? "gold" : "outline"} onClick={() => setTheme("dark")} size="sm">
              {t.settings.themeDark}
            </Button>
          </div>
        </div>
      </Section>

      {/* ── Store info ───────────────────────────────────────────────────── */}
      <Section icon={<Store className="w-4 h-4" />} title={t.settings.store}>
        <div>
          <Label className="text-xs">{t.settings.storeName}</Label>
          <Input
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
            onBlur={() => setSetting("storeName", storeName)}
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-xs">{t.settings.storePhone}</Label>
          <Input
            value={storePhone}
            onChange={(e) => setStorePhone(e.target.value)}
            onBlur={() => setSetting("storePhone", storePhone)}
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-xs">{t.settings.storeAddress}</Label>
          <Input
            value={storeAddress}
            onChange={(e) => setStoreAddress(e.target.value)}
            onBlur={() => setSetting("storeAddress", storeAddress)}
            className="mt-1"
          />
        </div>
        <Button variant="gold" className="w-full" onClick={handleSaveStore}>
          <Save className="w-4 h-4" />
          {t.form.save}
        </Button>
      </Section>
    </div>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-elegant space-y-3">
      <div className="flex items-center gap-2 text-gold">
        <span className="w-7 h-7 rounded-md bg-gold/15 grid place-items-center">{icon}</span>
        {title && <span className="text-sm font-semibold">{title}</span>}
      </div>
      {children}
    </div>
  );
}