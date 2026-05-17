import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { toast } from "sonner";
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
 * Request storage permissions for Android - shows system permission dialog
 */
async function requestStoragePermissions(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return true;
  
  try {
    console.log("Checking storage permissions...");
    
    // Check current permission status
    const status = await Filesystem.checkPermissions();
    console.log("Current permission status:", status);
    
    // If not granted, request permissions
    if (status.storage !== "granted") {
      console.log("Requesting storage permissions...");
      const result = await Filesystem.requestPermissions();
      console.log("Permission request result:", result);
      return result.storage === "granted";
    }
    
    return true;
  } catch (error) {
    console.error("Permission error:", error);
    // Try requesting anyway
    try {
      const result = await Filesystem.requestPermissions();
      return result.storage === "granted";
    } catch (e) {
      console.error("Fallback permission error:", e);
      return false;
    }
  }
}

/**
 * Show a toast message (for use in export/import)
 */
function showToast(message: string, type: "success" | "error" | "info") {
  if (typeof toast !== "undefined") {
    toast[type](message);
  }
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

  console.log("Starting export process...");

  // ── Native Android / iOS ──────────────────────────────────────────────────
  if (Capacitor.isNativePlatform()) {
    // Request permissions first - this will show the system permission dialog
    console.log("Requesting storage permissions...");
    const hasPermission = await requestStoragePermissions();
    
    if (!hasPermission) {
      console.error("Storage permission denied");
      throw new Error("PERMISSION_DENIED");
    }
    
    console.log("Permission granted, writing file...");
    
    // 1. Write file to the app's Documents directory
    try {
      await Filesystem.writeFile({
        path: fileName,
        data: json,
        directory: Directory.Documents,
        encoding: Encoding.UTF8,
      });
      console.log("File written successfully");
    } catch (writeError) {
      console.error("Write error:", writeError);
      // Try external storage as fallback
      try {
        console.log("Trying external storage...");
        await Filesystem.writeFile({
          path: fileName,
          data: json,
          directory: Directory.External,
          encoding: Encoding.UTF8,
        });
        console.log("File written to external storage");
      } catch (extError) {
        console.error("External write error:", extError);
        throw new Error("WRITE_FAILED");
      }
    }

    // 2. Resolve the native URI so we can share it
    const { uri } = await Filesystem.getUri({
      path: fileName,
      directory: Directory.Documents,
    });
    console.log("File URI:", uri);

    // 3. Share via native Android share sheet
    await Share.share({
      title: "ClowtheX Backup",
      url: uri,
      dialogTitle: "حفظ النسخة الاحتياطية",
    });
    console.log("Share dialog opened");

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