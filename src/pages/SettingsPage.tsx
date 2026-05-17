import { useEffect, useRef, useState } from "react";
import {
  Languages,
  Coins,
  Palette,
  Download,
  Upload,
  Store,
  Save,
  AlertTriangle,
  CheckCircle2,
  Loader2,
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
import { getSetting, setSetting } from "@/lib/db";
import {
  exportBackup,
  parseBackupFile,
  restoreBackup,
  type ImportPreview,
} from "@/lib/backup";
import { toast } from "sonner";
import type { Lang } from "@/i18n/translations";
import type { Currency } from "@/lib/db";

export function SettingsPage() {
  const { t, lang, setLang, theme, setTheme, currency, setCurrency, exchangeRate, setExchangeRate } =
    useApp();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [storeName, setStoreName]     = useState("");
  const [storePhone, setStorePhone]   = useState("");
  const [storeAddress, setStoreAddress] = useState("");

  const [exporting, setExporting]           = useState(false);
  const [importPreview, setImportPreview]   = useState<ImportPreview | null>(null);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportedFileName, setExportedFileName] = useState<string | null>(null);
  const [confirming, setConfirming]         = useState(false);

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

  // ── Export ─────────────────────────────────────────────────────────────────
  const handleExport = async () => {
    try {
      setExporting(true);
      const fileName = await exportBackup();
      setExportedFileName(fileName);
      setExportDialogOpen(true);
      toast.success(
        lang === "ar"
          ? `✅ تم التصدير: ${fileName}`
          : lang === "fr"
          ? `✅ Exporté: ${fileName}`
          : `✅ Exported: ${fileName}`,
        { duration: 4000 },
      );
    } catch (err) {
      // User cancelled the share dialog — not an error
      const name = (err as DOMException | Error)?.name;
      if (name === "AbortError") return;
      console.error("Export error:", err);
      toast.error(
        lang === "ar" ? "فشل التصدير" : lang === "fr" ? "Échec de l'export" : "Export failed",
      );
    } finally {
      setExporting(false);
    }
  };

  // ── Import — step 1: pick file ─────────────────────────────────────────────
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset input so same file can be picked again later
    e.target.value = "";
    if (!file) return;

    try {
      const preview = await parseBackupFile(file);
      setImportPreview(preview);
    } catch (err) {
      const msg = (err as Error).message;
      const label =
        lang === "ar"
          ? msg === "INVALID_JSON"
            ? "الملف تالف أو غير صالح"
            : msg === "MISSING_PRODUCTS"
            ? "الملف لا يحتوي على بيانات منتجات"
            : "ملف غير معروف"
          : lang === "fr"
          ? "Fichier invalide"
          : "Invalid backup file";
      toast.error(label);
    }
  };

  // ── Import — step 2: confirm & restore ────────────────────────────────────
  const handleConfirmImport = async () => {
    if (!importPreview) return;
    try {
      setConfirming(true);
      await restoreBackup(importPreview);
      setImportPreview(null);
      toast.success(t.settings.imported, { duration: 3000 });
      // Reload to refresh all React state / IndexedDB caches
      setTimeout(() => window.location.reload(), 1000);
    } catch (err) {
      console.error("Import error:", err);
      toast.error(t.settings.importError);
    } finally {
      setConfirming(false);
    }
  };

  // ── i18n helpers ──────────────────────────────────────────────────────────
  const i = (ar: string, fr: string, en: string) =>
    lang === "ar" ? ar : lang === "fr" ? fr : en;

  const fmt = (d: Date | null) =>
    d
      ? d.toLocaleString(lang === "ar" ? "ar-DZ" : lang, {
          dateStyle: "medium",
          timeStyle: "short",
        })
      : "";

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

      {/* ── Backup ───────────────────────────────────────────────────────── */}
      <Section icon={<Download className="w-4 h-4" />} title={t.settings.backup}>
        {/* Description */}
        <p className="text-xs text-muted-foreground">
          {i(
            "احفظ نسخة من جميع بيانات التطبيق أو استعدها من نسخة سابقة.",
            "Sauvegardez ou restaurez toutes vos données.",
            "Back up or restore all your app data.",
          )}
        </p>

        <div className="grid grid-cols-2 gap-3">
          {/* Export button */}
          <Button
            variant="outline"
            className="flex-col h-20 gap-1 border-dashed"
            onClick={handleExport}
            disabled={exporting}
          >
            {exporting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Download className="w-5 h-5 text-green-500" />
            )}
            <span className="text-xs font-medium">
              {exporting
                ? i("جارٍ التصدير…", "Export…", "Exporting…")
                : t.settings.export}
            </span>
          </Button>

          {/* Import button */}
          <Button
            variant="outline"
            className="flex-col h-20 gap-1 border-dashed"
            onClick={() => fileInputRef.current?.click()}
            disabled={confirming}
          >
            <Upload className="w-5 h-5 text-blue-500" />
            <span className="text-xs font-medium">{t.settings.import}</span>
          </Button>
        </div>

        {/* Hidden file input — accept JSON broadly for max Android compat */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json,text/plain,*/*"
          hidden
          onChange={handleFileChange}
        />
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

      {/* ── Export confirmation dialog ────────────────────────────────────── */}
      <AlertDialog open={exportDialogOpen} onOpenChange={(open) => !open && setExportDialogOpen(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
              {i("تم حفظ النسخة الاحتياطية", "Sauvegarde enregistrée", "Backup saved")}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                <p>
                  {i(
                    "لقد تم حفظ الملف في الموقع الذي اخترته.",
                    "Le fichier a été enregistré à l'emplacement choisi.",
                    "The file was saved at the chosen location.",
                  )}
                </p>
                {exportedFileName && (
                  <p className="text-xs text-muted-foreground">
                    {i("اسم الملف:", "Nom du fichier:", "File name:")} {exportedFileName}
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogAction
              onClick={() => setExportDialogOpen(false)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {i("حسناً", "OK", "OK")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Import confirmation dialog ────────────────────────────────────── */}
      <AlertDialog open={!!importPreview} onOpenChange={(open) => !open && !confirming && setImportPreview(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
              {i("تأكيد الاستيراد", "Confirmer l'importation", "Confirm Import")}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm">
                <p className="text-destructive font-medium">
                  {i(
                    "⚠️ سيتم حذف جميع البيانات الحالية واستبدالها بمحتوى الملف. هذا الإجراء لا يمكن التراجع عنه.",
                    "⚠️ Toutes les données actuelles seront remplacées. Cette action est irréversible.",
                    "⚠️ All current data will be replaced. This cannot be undone.",
                  )}
                </p>

                {importPreview && (
                  <div className="rounded-lg border bg-muted/50 p-3 space-y-2">
                    {importPreview.exportedAt && (
                      <p className="text-xs text-muted-foreground">
                        {i("تاريخ النسخة:", "Date:", "Backup date:")} {fmt(importPreview.exportedAt)}
                      </p>
                    )}
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      <span>
                        <strong>{importPreview.productsCount}</strong>{" "}
                        {i("منتج", "produit(s)", "product(s)")}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      <span>
                        <strong>{importPreview.salesCount}</strong>{" "}
                        {i("عملية بيع", "vente(s)", "sale(s)")}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={confirming}>
              {i("إلغاء — لا تغيير", "Annuler", "Cancel — keep data")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmImport}
              disabled={confirming}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {confirming ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {i("جارٍ الاستيراد…", "Importation…", "Importing…")}
                </>
              ) : (
                i("نعم، استورد البيانات", "Importer", "Yes, Import")
              )}
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
        <span className="w-7 h-7 rounded-md bg-gold/15 grid place-items-center">{icon}</span>
        {title && <span className="text-sm font-semibold">{title}</span>}
      </div>
      {children}
    </div>
  );
}
