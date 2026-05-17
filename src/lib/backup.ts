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
 * Exports all data to a JSON file.
 * - On Android (Capacitor): writes file to Documents folder then triggers
 *   the native Android Share sheet so the user can choose where to save it.
 * - On Web: triggers a browser download.
 *
 * Returns a human-readable description of where the file was saved.
 */
export async function exportBackup(): Promise<string> {
  const data = await collectBackupData();
  const json = JSON.stringify(data, null, 2);
  const dateStr = new Date().toISOString().slice(0, 10);
  const fileName = `clowthex-backup-${dateStr}.json`;

  // ── Native Android / iOS ──────────────────────────────────────────────────
  if (Capacitor.isNativePlatform()) {
    // 1. Write file to the app's Documents directory (no permission needed)
    await Filesystem.writeFile({
      path: fileName,
      data: json,
      directory: Directory.Documents,
      encoding: Encoding.UTF8,
      recursive: true,
    });

    // 2. Resolve the native URI so we can share it
    const { uri } = await Filesystem.getUri({
      path: fileName,
      directory: Directory.Documents,
    });

    // 3. Share via native Android share sheet
    //    (user can choose: save to Files, send via WhatsApp, email, etc.)
    await Share.share({
      title: "ClowtheX Backup",
      url: uri,
      dialogTitle: "حفظ النسخة الاحتياطية",
    });

    return fileName;
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
 * All three stores (products, sales, settings) are cleared first to prevent
 * orphaned records, then refilled inside the same IndexedDB transaction.
 */
export async function restoreBackup(preview: ImportPreview): Promise<void> {
  await importAllData({
    products: preview.data.products,
    sales: preview.data.sales,
    settings: preview.data.settings,
  });
}

// ─── Android File Picker Helper ───────────────────────────────────────────────

/**
 * Opens the native Android file picker to select a backup file.
 * This is more reliable on Android than using a hidden file input.
 * Returns the file content as a string, or throws an error if cancelled.
 */
export async function pickAndReadBackupFile(): Promise<File> {
  // On Android, we read from the Documents directory where we saved backups
  const docsDir = Directory.Documents;
  
  try {
    // List all JSON files in Documents directory
    const result = await Filesystem.readdir({
      directory: docsDir,
      path: "",
    });
    
    // Find backup files (they start with "clowthex-backup-")
    const backupFiles = result.files.filter(
      (f) => f.name.startsWith("clowthex-backup-") && f.name.endsWith(".json")
    );
    
    if (backupFiles.length === 0) {
      throw new Error("NO_BACKUP_FILES");
    }
    
    // Sort by name (newest first) and get the most recent one
    backupFiles.sort((a, b) => b.name.localeCompare(a.name));
    const mostRecent = backupFiles[0];
    
    // Read the file content
    const content = await Filesystem.readFile({
      directory: docsDir,
      path: mostRecent.name,
      encoding: Encoding.UTF8,
    });
    
    // Create a File object from the content
    const blob = new Blob([content.data], { type: "application/json" });
    const file = new File([blob], mostRecent.name, { type: "application/json" });
    
    return file;
  } catch (error: any) {
    // If Filesystem fails, the user can still use the web file input
    throw new Error("FILE_READ_ERROR");
  }
}
