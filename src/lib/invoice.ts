import jsPDF from "jspdf";
import type { Sale } from "./db";

export interface StoreInfo {
  name?: string;
  phone?: string;
  address?: string;
}

export function generateInvoicePDF(
  sale: Sale,
  store: StoreInfo,
  labels: {
    invoice: string;
    invoiceNo: string;
    date: string;
    item: string;
    qty: string;
    price: string;
    lineTotal: string;
    subtotal: string;
    discount: string;
    total: string;
    thanks: string;
    cash: string;
    card: string;
    other: string;
    paymentMethod: string;
  },
  formatPrice: (dzd: number) => string,
): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: [80, 240] });
  let y = 8;
  const center = 40;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(store.name || "ClowtheX", center, y, { align: "center" });
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  if (store.phone) {
    doc.text(store.phone, center, y, { align: "center" });
    y += 4;
  }
  if (store.address) {
    doc.text(store.address, center, y, { align: "center" });
    y += 4;
  }
  y += 2;
  doc.setLineDashPattern([1, 1], 0);
  doc.line(4, y, 76, y);
  doc.setLineDashPattern([], 0);
  y += 4;

  doc.setFontSize(9);
  doc.text(`${labels.invoice}`, 4, y);
  y += 4;
  doc.setFontSize(8);
  doc.text(`${labels.invoiceNo}: ${sale.id.slice(-8).toUpperCase()}`, 4, y);
  y += 4;
  doc.text(`${labels.date}: ${new Date(sale.createdAt).toLocaleString()}`, 4, y);
  y += 4;
  if (sale.customerName) {
    doc.text(sale.customerName, 4, y);
    y += 4;
  }
  y += 1;
  doc.line(4, y, 76, y);
  y += 4;

  doc.setFont("helvetica", "bold");
  doc.text(labels.item, 4, y);
  doc.text(labels.qty, 44, y, { align: "right" });
  doc.text(labels.price, 58, y, { align: "right" });
  doc.text(labels.lineTotal, 76, y, { align: "right" });
  y += 3;
  doc.setFont("helvetica", "normal");
  doc.line(4, y, 76, y);
  y += 4;

  for (const it of sale.items) {
    const name = it.name.length > 22 ? it.name.slice(0, 22) + "…" : it.name;
    doc.text(name, 4, y);
    doc.text(String(it.quantity), 44, y, { align: "right" });
    doc.text(formatPrice(it.unitPrice), 58, y, { align: "right" });
    doc.text(formatPrice(it.unitPrice * it.quantity), 76, y, { align: "right" });
    y += 4;
  }

  y += 1;
  doc.line(4, y, 76, y);
  y += 4;

  const pay =
    sale.paymentMethod === "cash" ? labels.cash : sale.paymentMethod === "card" ? labels.card : labels.other;

  doc.text(`${labels.subtotal}:`, 4, y);
  doc.text(formatPrice(sale.subtotal), 76, y, { align: "right" });
  y += 4;
  if (sale.discount > 0) {
    doc.text(`${labels.discount}:`, 4, y);
    doc.text(`- ${formatPrice(sale.discount)}`, 76, y, { align: "right" });
    y += 4;
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(`${labels.total}:`, 4, y);
  doc.text(formatPrice(sale.total), 76, y, { align: "right" });
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(`${labels.paymentMethod}: ${pay}`, 4, y);
  y += 6;
  doc.line(4, y, 76, y);
  y += 5;
  doc.setFontSize(9);
  doc.text(labels.thanks, center, y, { align: "center" });
  return doc;
}
