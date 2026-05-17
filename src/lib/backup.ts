import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import {
  getAllProducts,
  getAllSales,
  getAllSettings,
  importAllData,
  type Product,
  type Sale,
  type Settings,
} from "./db";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BackupData {
  version: 3;
  appName: "ClowtheX";
  exportedAt: string;
  products: Product[];
  sales: Sale[];
  settings: Settings[];
}

export interface ImportPreview {
  data: BackupData;
  productsCount: number;
  salesCount: number;
  exportedAt: Date | null;
}

// ─── Export ───────────────────────────────────────────────────────────────────

/**
 * Gathers all app data from IndexedDB and returns a complete BackupData object.
 */
export async function collectBackupData(): Promise<BackupData> {
  const [products, sales, settings] = await Promise.all([
    getAllProducts(),
    getAllSales(),
    getAllSettings(),
  ]);
  return {
    version: 3,
    appName: "ClowtheX",
    exportedAt: new Date().toISOString(),
    products,
    sales,
    settings,
  };
}

/**
 * Export backup using Share API with base64 data
 * This approach works without storage permissions on Android 10+
 */
export async function exportBackup(): Promise<string> {
  const data = await collectBackupData();
  const json = JSON.stringify(data, null, 2);
  const dateStr = new Date().toISOString().slice(0, 10);
  const fileName = `clowthex-backup-${dateStr}.json`;

  // ── Native Android / iOS ──────────────────────────────────────────────────
  if (Capacitor.isNativePlatform()) {
    try {
      // Write to app's private directory (no permission needed)
      await Filesystem.writeFile({
        path: fileName,
        data: json,
        directory: Directory.Data,
        encoding: Encoding.UTF8,
      });

      // Get the file URI
      const { uri } = await Filesystem.getUri({
        path: fileName,
        directory: Directory.Data,
      });

      // Share the file using native share sheet
      await Share.share({
        title: "ClowtheX Backup",
        text: `نسخة احتياطية من ${new Date().toLocaleDateString("ar-DZ")}`,
        url: uri,
        dialogTitle: "حفظ النسخة الاحتياطية",
      });

      return fileName;
    } catch (error) {
      console.error("Export error:", error);
      
      // If Share fails, try to save to Documents folder
      try {
        await Filesystem.writeFile({
          path: fileName,
          data: json,
          directory: Directory.Documents,
          encoding: Encoding.UTF8,
        });

        const { uri } = await Filesystem.getUri({
          path: fileName,
          directory: Directory.Documents,
        });

        await Share.share({
          title: "ClowtheX Backup",
          url: uri,
          dialogTitle: "حفظ النسخة الاحتياطية",
        });

        return fileName;
      } catch (docError) {
        console.error("Documents folder error:", docError);
        throw new Error("EXPORT_FAILED");
      }
    }
  }

  // ── Web / PWA ─────────────────────────────────────────────────────────────
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return fileName;
}

// ─── Import / Parse ───────────────────────────────────────────────────────────

/**
 * Reads and validates a File object containing a ClowtheX backup.
 * Returns an ImportPreview so the caller can show a confirmation dialog.
 * Throws a localised error string on invalid data.
 */
export async function parseBackupFile(file: File): Promise<ImportPreview> {
  const text = await file.text();
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error("INVALID_JSON");
  }

  if (!raw || typeof raw !== "object") throw new Error("INVALID_FORMAT");
  const obj = raw as Record<string, unknown>;

  if (!Array.isArray(obj.products)) throw new Error("MISSING_PRODUCTS");

  const data: BackupData = {
    version: 3,
    appName: "ClowtheX",
    exportedAt:
      typeof obj.exportedAt === "string" ? obj.exportedAt : new Date().toISOString(),
    products: obj.products as Product[],
    sales: Array.isArray(obj.sales) ? (obj.sales as Sale[]) : [],
    settings: Array.isArray(obj.settings) ? (obj.settings as Settings[]) : [],
  };

  return {
    data,
    productsCount: data.products.length,
    salesCount: data.sales.length,
    exportedAt: data.exportedAt ? new Date(data.exportedAt) : null,
  };
}

/**
 * Atomically replaces all app data with the content of the backup.
 */
export async function restoreBackup(preview: ImportPreview): Promise<void> {
  await importAllData({
    products: preview.data.products,
    sales: preview.data.sales,
    settings: preview.data.settings,
  });
}