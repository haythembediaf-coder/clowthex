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

export interface ExportResult {
  fileName: string;
  size: number;
  platform: "android" | "ios" | "web";
  timestamp: string;
}

export interface BackupError {
  code: string;
  message: string;
  original?: unknown;
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

// ─── Permissions & File Creation ──────────────────────────────────────────────

/**
 * Check if we're on Android platform
 */
export function isAndroid(): boolean {
  if (!Capacitor.isNativePlatform()) return false;
  return Capacitor.getPlatform() === "android";
}

/**
 * Check if we're on iOS platform
 */
export function isIOS(): boolean {
  if (!Capacitor.isNativePlatform()) return false;
  return Capacitor.getPlatform() === "ios";
}

/**
 * Create a temporary file for export. 
 * Strategy:
 * - Android: Cache directory (app-scoped, no permissions, auto-cleanup)
 * - iOS: Documents directory
 * - Web: Returns data as-is (handled by browser download)
 * 
 * @throws Error with code if creation fails
 */
async function createTempFile(fileName: string, data: string): Promise<string> {
  if (!Capacitor.isNativePlatform()) {
    return data; // Return data directly on web
  }

  try {
    // Determine appropriate directory based on platform
    const directory = isIOS() ? Directory.Documents : Directory.Cache;
    
    await Filesystem.writeFile({
      path: fileName,
      data: data,
      directory: directory,
      encoding: Encoding.UTF8,
    });

    const { uri } = await Filesystem.getUri({
      path: fileName,
      directory: directory,
    });

    return uri;
  } catch (err) {
    console.error("Failed to create temp file:", err);
    
    // Provide more specific error messages
    const errorMsg = (err as Error)?.message || String(err);
    
    if (errorMsg.includes("permission") || errorMsg.includes("Permission")) {
      throw new Error("PERMISSION_DENIED");
    }
    if (errorMsg.includes("storage") || errorMsg.includes("Storage")) {
      throw new Error("STORAGE_ERROR");
    }
    
    throw new Error("TEMP_FILE_ERROR");
  }
}

/**
 * Clean up a temporary file after export (optional, Cache auto-cleans)
 */
export async function cleanupTempFile(fileName: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  
  try {
    const directory = isIOS() ? Directory.Documents : Directory.Cache;
    await Filesystem.deleteFile({
      path: fileName,
      directory: directory,
    });
  } catch (err) {
    // Silently ignore cleanup errors (Cache auto-manages anyway)
    console.warn("Failed to cleanup temp file:", err);
  }
}

// ─── Export ───────────────────────────────────────────────────────────────────

/**
 * Exports all data to a JSON file.
 * - On Android (Capacitor): writes file to Cache folder then triggers
 *   the native Android Share sheet so the user can choose where to save it.
 * - On iOS: writes to Documents folder
 * - On Web: triggers a browser download.
 *
 * @throws Error if export fails
 * @returns Export result with metadata
 */
export async function exportBackup(): Promise<ExportResult> {
  const startTime = Date.now();
  const data = await collectBackupData();
  const json = JSON.stringify(data, null, 2);
  const dateStr = new Date().toISOString().slice(0, 10);
  const fileName = `clowthex-backup-${dateStr}.json`;
  const platform = Capacitor.getPlatform() as "android" | "ios" | "web";

  // ── Native Android / iOS ──────────────────────────────────────────────────
  if (Capacitor.isNativePlatform()) {
    try {
      // 1. Create temp file in appropriate directory
      const fileUri = await createTempFile(fileName, json);

      // 2. Share via native share sheet
      //    (user can choose: save to Files, send via WhatsApp, email, etc.)
      try {
        await Share.share({
          title: "ClowtheX Backup",
          url: fileUri,
          dialogTitle: "حفظ النسخة الاحتياطية",
        });
      } catch (shareErr) {
        const errMsg = (shareErr as Error)?.message || String(shareErr);
        
        // User cancelled share dialog — not an error
        if (
          errMsg === "Share canceled." ||
          errMsg.includes("canceled") ||
          errMsg.includes("Cancelled")
        ) {
          throw shareErr;
        }
        
        // Other share errors are still export failures
        throw shareErr;
      }

      return {
        fileName,
        size: json.length,
        platform,
        timestamp: new Date().toISOString(),
      };
    } catch (err) {
      const message = (err as Error)?.message;
      
      // User cancelled — re-throw as-is
      if (message?.includes("canceled") || message?.includes("Cancelled")) {
        throw err;
      }
      
      console.error("Export error:", err);
      throw err;
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
  
  setTimeout(() => {
    try {
      URL.revokeObjectURL(url);
    } catch (err) {
      console.warn("Failed to revoke object URL:", err);
    }
  }, 2000);

  return {
    fileName,
    size: json.length,
    platform,
    timestamp: new Date().toISOString(),
  };
}

// ─── Import / Parse ───────────────────────────────────────────────────────────

/**
 * Reads and validates a File object containing a ClowtheX backup.
 * Returns an ImportPreview so the caller can show a confirmation dialog.
 * 
 * @param file The backup file to parse
 * @throws Error with specific error code on validation failure
 */
export async function parseBackupFile(file: File): Promise<ImportPreview> {
  // Validate file size (max 50MB)
  const maxSize = 50 * 1024 * 1024;
  if (file.size > maxSize) {
    throw new Error("FILE_TOO_LARGE");
  }

  // Validate file type
  if (
    !file.type.includes("json") &&
    !file.name.endsWith(".json")
  ) {
    throw new Error("INVALID_FILE_TYPE");
  }

  let text: string;
  try {
    text = await file.text();
  } catch (err) {
    console.error("Failed to read file:", err);
    throw new Error("FILE_READ_ERROR");
  }

  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (err) {
    console.error("Invalid JSON:", err);
    throw new Error("INVALID_JSON");
  }

  if (!raw || typeof raw !== "object") {
    throw new Error("INVALID_FORMAT");
  }

  const obj = raw as Record<string, unknown>;

  // Validate essential data
  if (!Array.isArray(obj.products)) {
    throw new Error("MISSING_PRODUCTS");
  }

  // Check for minimum products (at least 1)
  if (obj.products.length === 0) {
    throw new Error("EMPTY_BACKUP");
  }

  // Validate app name (must be ClowtheX)
  if (obj.appName !== "ClowtheX") {
    throw new Error("INCOMPATIBLE_BACKUP");
  }

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
