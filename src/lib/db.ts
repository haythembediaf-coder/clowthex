import { openDB, type DBSchema, type IDBPDatabase } from "idb";

export type Currency = "DZD";

export interface Product {
  id: string;
  name: string;
  category: string;
  size?: string;
  color?: string;
  purchasePrice: number;
  salePrice: number;
  quantity: number;
  lowStockThreshold: number;
  image?: string;
  barcode?: string;
  createdAt: number;
  updatedAt: number;
}

export interface SaleItem {
  productId: string;
  name: string;
  unitPrice: number;
  purchasePrice: number;
  quantity: number;
}

export interface Sale {
  id: string;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  total: number;
  profit: number;
  paymentMethod: "cash" | "card" | "other";
  currency: Currency;
  exchangeRate: number;
  customerName?: string;
  createdAt: number;
}

export interface Settings {
  key: string;
  value: unknown;
}

interface StoreSchema extends DBSchema {
  products: {
    key: string;
    value: Product;
    indexes: { "by-category": string; "by-name": string; "by-barcode": string };
  };
  sales: {
    key: string;
    value: Sale;
    indexes: { "by-date": number };
  };
  settings: {
    key: string;
    value: Settings;
  };
}

const DB_NAME = "style-stock-manager";
const DB_VERSION = 2;

let dbPromise: Promise<IDBPDatabase<StoreSchema>> | null = null;

export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<StoreSchema>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (!db.objectStoreNames.contains("products")) {
          const store = db.createObjectStore("products", { keyPath: "id" });
          store.createIndex("by-category", "category");
          store.createIndex("by-name", "name");
          store.createIndex("by-barcode", "barcode");
        }
        if (!db.objectStoreNames.contains("sales")) {
          const sales = db.createObjectStore("sales", { keyPath: "id" });
          sales.createIndex("by-date", "createdAt");
        }
        if (!db.objectStoreNames.contains("settings")) {
          db.createObjectStore("settings", { keyPath: "key" });
        }
      },
    });
  }
  return dbPromise;
}

export async function getAllProducts(): Promise<Product[]> {
  const db = await getDB();
  return db.getAll("products");
}

export async function getProduct(id: string) {
  const db = await getDB();
  return db.get("products", id);
}

export async function findProductByBarcode(barcode: string): Promise<Product | undefined> {
  const db = await getDB();
  const all = await db.getAll("products");
  return all.find((p) => p.barcode && p.barcode === barcode);
}

export async function saveProduct(p: Product) {
  const db = await getDB();
  await db.put("products", p);
}

export async function deleteProduct(id: string) {
  const db = await getDB();
  await db.delete("products", id);
}

export async function saveSale(sale: Sale) {
  const db = await getDB();
  const tx = db.transaction(["sales", "products"], "readwrite");
  await tx.objectStore("sales").put(sale);
  for (const item of sale.items) {
    const prod = await tx.objectStore("products").get(item.productId);
    if (prod) {
      prod.quantity = Math.max(0, prod.quantity - item.quantity);
      prod.updatedAt = Date.now();
      await tx.objectStore("products").put(prod);
    }
  }
  await tx.done;
}

export async function getAllSales(): Promise<Sale[]> {
  const db = await getDB();
  return db.getAll("sales");
}

export async function getSale(id: string) {
  const db = await getDB();
  return db.get("sales", id);
}

export async function deleteSale(id: string) {
  const db = await getDB();
  await db.delete("sales", id);
}

export async function getSetting<T = unknown>(key: string): Promise<T | undefined> {
  const db = await getDB();
  const row = await db.get("settings", key);
  return row?.value as T | undefined;
}

export async function setSetting(key: string, value: unknown) {
  const db = await getDB();
  await db.put("settings", { key, value });
}

export async function getAllSettings(): Promise<Settings[]> {
  const db = await getDB();
  return db.getAll("settings");
}

export async function importAllData(data: {
  products: Product[];
  sales: Sale[];
  settings?: Settings[];
}) {
  const db = await getDB();
  const tx = db.transaction(["products", "sales", "settings"], "readwrite");
  await tx.objectStore("products").clear();
  await tx.objectStore("sales").clear();
  await tx.objectStore("settings").clear();
  for (const p of data.products) {
    await tx.objectStore("products").put(p);
  }
  for (const s of data.sales) {
    await tx.objectStore("sales").put(s);
  }
  if (Array.isArray(data.settings)) {
    for (const s of data.settings) {
      await tx.objectStore("settings").put(s);
    }
  }
  await tx.done;
}

export function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
