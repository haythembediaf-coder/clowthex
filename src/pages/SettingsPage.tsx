import { useEffect, useRef, useState } from "react";
import { Languages, Coins, Palette, Download, Upload, Store, Save, AlertTriangle } from "lucide-react";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useApp } from "@/contexts/AppContext";
import {
  getAllProducts,
  getAllSales,
  getAllSettings,
  importAllData,
  getSetting,
  setSetting,
  type Product,
  type Sale,
  type Settings,
} from "@/lib/db";
import { toast } from "sonner";
import type { Lang } from "@/i18n/translations";
import type { Currency } from "@/lib/db";

interface ImportPreview {
  products: Product[];
  sales: Sale[];
  settings?: Settings[];
  exportedAt?: string;
}

export function SettingsPage() {
  const {
    t,
    lang,
    setLang,
    theme,
    setTheme,
    currency,
    setCurrency,
    exchangeRate,
    setExchangeRate,
  } = useApp();

  const fileRef = useRef<HTMLInputElement>(null);
  const [storeName, setStoreName] = useState("");
  const [storePhone, setStorePhone] = useState("");
  const [storeAddress, setStoreAddress] = useState("");
  const [exporting, setExporting] = useState(false);
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    (async () => {
      setStoreName((await getSetting<string>("storeName")) || "");
      setStorePhone((await getSetting<string>("storePhone")) || "");
      setStoreAddress((await getSetting<string>("storeAddress")) || "");
    })();
  }, []);

  const saveStore = async (
    key: "storeName" | "storePhone" | "storeAddress",
    value: string,
  ) => {
    await setSetting(key, value);
  };

  const handleSaveStore = async () => {
    await Promise.all([
      setSetting("storeName", storeName),
      setSetting("storePhone", storePhone),
      setSetting("storeAddress", storeAddress),
    ]);
    toast.success(t.settings.saved);
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      const [products, sales, settings] = await Promise.all([
        getAllProducts(),
        getAllSales(),
        getAllSettings(),
      ]);

      const data = {
        version: 3,
        appName: "ClowtheX",
        exportedAt: new Date().toISOString(),
        products,
        sales,
        settings,
      };

      const json = JSON.stringify(data, null, 2);
      const dateStr = new Date().toISOString().slice(0, 10);
      const fileName = `clowthex-backup-${dateStr}.json`;

      // Try Web Share API (native save dialog on Android)
      if (typeof navigator.share === "function") {
        try {
          const file = new File([json], fileName, { type: "application/json" });
          const canShare =
            typeof navigator.canShare === "function" &&
            navigator.canShare({ files: [file] });
          if (canShare) {
            await navigator.share({
              files: [file],
              title: "ClowtheX Backup",
            });
            toast.success(
              lang === "ar"
                ? "تم التصدير بنجاح"
                : lang === "fr"
                  ? "Exporté avec succès"
                  : "Exported successfully",
            );
            return;
          }
        } catch (shareErr) {
          // User cancelled share — don't fallthrough to download
          if ((shareErr as DOMException)?.name === "AbortError") return;
        }
      }

      // Fallback: trigger browser download
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);

      toast.success(
        lang === "ar"
          ? `تم التصدير — ${products.length} منتج، ${sales.length} عملية بيع`
          : lang === "fr"
            ? `Exporté — ${products.length} produits, ${sales.length} ventes`
            : `Exported — ${products.length} products, ${sales.length} sales`,
      );
    } catch {
      toast.error(
        lang === "ar" ? "فشل التصدير" : lang === "fr" ? "Échec export" : "Export failed",
      );
    } finally {
      setExporting(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (!Array.isArray(data.products)) {
        toast.error(t.settings.importError);
        return;
      }

      // Show confirmation dialog with preview
      setImportPreview({
        products: data.products ?? [],
        sales: data.sales ?? [],
        settings: data.settings,
        exportedAt: data.exportedAt,
      });
    } catch {
      toast.error(t.settings.importError);
    }
  };

  const confirmImport = async () => {
    if (!importPreview) return;
    try {
      setImporting(true);
      await importAllData({
        products: importPreview.products,
        sales: importPreview.sales,
        settings: importPreview.settings,
      });
      setImportPreview(null);
      toast.success(t.settings.imported);
      // Reload page to refresh all app state
      setTimeout(() => window.location.reload(), 800);
    } catch {
      toast.error(t.settings.importError);
    } finally {
      setImporting(false);
    }
  };

  const cancelImport = () => {
    setImportPreview(null);
  };

  const importDialogTitle =
    lang === "ar"
      ? "تأكيد الاستيراد"
      : lang === "fr"
        ? "Confirmer l'importation"
        : "Confirm Import";

  const importDialogDesc =
    lang === "ar"
      ? "سيتم استبدال جميع البيانات الحالية بهذا الملف. هذا الإجراء لا يمكن التراجع عنه."
      : lang === "fr"
        ? "Toutes les données actuelles seront remplacées par ce fichier. Cette action est irréversible."
        : "All current data will be replaced with this file. This action cannot be undone.";

  const confirmLabel =
    lang === "ar" ? "نعم، استورد" : lang === "fr" ? "Importer" : "Yes, Import";
  const cancelLabel =
    lang === "ar" ? "إلغاء" : lang === "fr" ? "Annuler" : "Cancel";

  const productsLabel =
    lang === "ar" ? "منتج" : lang === "fr" ? "produit(s)" : "product(s)";
  const salesLabel =
    lang === "ar" ? "عملية بيع" : lang === "fr" ? "vente(s)" : "sale(s)";

  return (
    <div className="px-4 py-5 space-y-5">
      <h2 className="text-xl font-bold">{t.settings.title}</h2>

      <Section icon={<Languages className="w-4 h-4" />}>
        <div>
          <Label className="text-xs">{t.settings.language}</Label>
          <Select value={lang} onValueChange={(v) => setLang(v as Lang)}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ar">العربية</SelectItem>
              <SelectItem value="fr">Français</SelectItem>
              <SelectItem value="en">English</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Section>

      <Section icon={<Coins className="w-4 h-4" />}>
        <div>
          <Label className="text-xs">{t.settings.currency}</Label>
          <Select
            value={currency}
            onValueChange={(v) => setCurrency(v as Currency)}
          >
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="DZD">DZD — د.ج</SelectItem>
              <SelectItem value="EUR">EUR — €</SelectItem>
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
            onChange={(e) =>
              setExchangeRate(Math.max(0, Number(e.target.value) || 0))
            }
            className="mt-1"
          />
        </div>
      </Section>

      <Section icon={<Palette className="w-4 h-4" />}>
        <div>
          <Label className="text-xs">{t.settings.theme}</Label>
          <div className="grid grid-cols-2 gap-2 mt-1">
            <Button
              variant={theme === "light" ? "gold" : "outline"}
              onClick={() => setTheme("light")}
              size="sm"
            >
              {t.settings.themeLight}
            </Button>
            <Button
              variant={theme === "dark" ? "gold" : "outline"}
              onClick={() => setTheme("dark")}
              size="sm"
            >
              {t.settings.themeDark}
            </Button>
          </div>
        </div>
      </Section>

      <Section icon={<Store className="w-4 h-4" />} title={t.settings.store}>
        <div>
          <Label className="text-xs">{t.settings.storeName}</Label>
          <Input
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
            onBlur={() => saveStore("storeName", storeName)}
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-xs">{t.settings.storePhone}</Label>
          <Input
            value={storePhone}
            onChange={(e) => setStorePhone(e.target.value)}
            onBlur={() => saveStore("storePhone", storePhone)}
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-xs">{t.settings.storeAddress}</Label>
          <Input
            value={storeAddress}
            onChange={(e) => setStoreAddress(e.target.value)}
            onBlur={() => saveStore("storeAddress", storeAddress)}
            className="mt-1"
          />
        </div>
        <Button variant="gold" className="w-full" onClick={handleSaveStore}>
          <Save className="w-4 h-4" />
          {t.form.save}
        </Button>
      </Section>

      <Section icon={<Download className="w-4 h-4" />} title={t.settings.backup}>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={handleExport} disabled={exporting}>
            <Download className="w-4 h-4" />
            {exporting
              ? lang === "ar" ? "جارٍ..." : "..."
              : t.settings.export}
          </Button>
          <Button
            variant="outline"
            onClick={() => fileRef.current?.click()}
            disabled={importing}
          >
            <Upload className="w-4 h-4" />
            {t.settings.import}
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={handleFileChange}
          />
        </div>
      </Section>

      {/* Import Confirmation Dialog */}
      <AlertDialog open={!!importPreview} onOpenChange={(o) => !o && cancelImport()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              {importDialogTitle}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>{importDialogDesc}</p>
                {importPreview && (
                  <div className="rounded-lg bg-muted p-3 text-sm space-y-1">
                    {importPreview.exportedAt && (
                      <p className="text-muted-foreground text-xs">
                        {new Date(importPreview.exportedAt).toLocaleString(
                          lang === "ar" ? "ar-DZ" : lang,
                        )}
                      </p>
                    )}
                    <p className="font-medium">
                      📦 {importPreview.products.length} {productsLabel}
                    </p>
                    <p className="font-medium">
                      🧾 {importPreview.sales.length} {salesLabel}
                    </p>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelImport} disabled={importing}>
              {cancelLabel}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmImport}
              disabled={importing}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {importing
                ? lang === "ar" ? "جارٍ الاستيراد..." : "Importing..."
                : confirmLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
        <span className="w-7 h-7 rounded-md bg-gold/15 grid place-items-center">
          {icon}
        </span>
        {title && <span className="text-sm font-semibold">{title}</span>}
      </div>
      {children}
    </div>
  );
}
