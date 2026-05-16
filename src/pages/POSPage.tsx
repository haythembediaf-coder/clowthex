import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  ScanLine,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Receipt,
  X,
  Printer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useApp } from "@/contexts/AppContext";
import {
  type Product,
  type Sale,
  type SaleItem,
  findProductByBarcode,
  getAllProducts,
  getSetting,
  newId,
  saveSale,
} from "@/lib/db";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { generateInvoicePDF, type StoreInfo } from "@/lib/invoice";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function POSPage() {
  const { t, formatPrice, currency, exchangeRate } = useApp();
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [scanOpen, setScanOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [customerName, setCustomerName] = useState("");
  const [paymentMethod, setPaymentMethod] =
    useState<"cash" | "card" | "other">("cash");
  const [lastSale, setLastSale] = useState<Sale | null>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);

  const refresh = async () => setProducts(await getAllProducts());
  useEffect(() => {
    refresh();
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.trim().toLowerCase();
    return products
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.barcode?.toLowerCase().includes(q),
      )
      .slice(0, 8);
  }, [products, search]);

  const addToCart = (p: Product) => {
    if (p.quantity <= 0) {
      toast.error(t.inventory.outOfStock);
      return;
    }
    setCart((c) => {
      const existing = c.find((i) => i.productId === p.id);
      if (existing) {
        if (existing.quantity >= p.quantity) {
          toast.warning(t.pos.stockWarning);
          return c;
        }
        return c.map((i) =>
          i.productId === p.id ? { ...i, quantity: i.quantity + 1 } : i,
        );
      }
      return [
        ...c,
        {
          productId: p.id,
          name: p.name,
          unitPrice: p.salePrice,
          purchasePrice: p.purchasePrice,
          quantity: 1,
        },
      ];
    });
    setSearch("");
  };

  const handleScanned = async (code: string) => {
    const p = await findProductByBarcode(code);
    if (!p) {
      toast.error(t.pos.notFound);
      return;
    }
    addToCart(p);
  };

  const updateQty = (productId: string, delta: number) => {
    setCart((c) =>
      c
        .map((i) => {
          if (i.productId !== productId) return i;
          const prod = products.find((p) => p.id === productId);
          const max = prod?.quantity ?? 0;
          const next = i.quantity + delta;
          if (next > max) {
            toast.warning(t.pos.stockWarning);
            return i;
          }
          return { ...i, quantity: next };
        })
        .filter((i) => i.quantity > 0),
    );
  };

  const removeItem = (productId: string) =>
    setCart((c) => c.filter((i) => i.productId !== productId));

  const subtotal = cart.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const total = Math.max(0, subtotal - discount);
  const profit = cart.reduce(
    (s, i) => s + (i.unitPrice - i.purchasePrice) * i.quantity,
    0,
  ) - discount;

  const checkout = async () => {
    if (cart.length === 0) return;
    const sale: Sale = {
      id: newId(),
      items: cart,
      subtotal,
      discount,
      total,
      profit,
      paymentMethod,
      currency,
      exchangeRate,
      customerName: customerName.trim() || undefined,
      createdAt: Date.now(),
    };
    await saveSale(sale);
    toast.success(t.pos.saleSuccess);
    setLastSale(sale);
    setReceiptOpen(true);
    setCart([]);
    setDiscount(0);
    setCustomerName("");
    setPaymentMethod("cash");
    refresh();
  };

  const printReceipt = async () => {
    if (!lastSale) return;
    const store: StoreInfo = {
      name: (await getSetting<string>("storeName")) || "ClowtheX",
      phone: await getSetting<string>("storePhone"),
      address: await getSetting<string>("storeAddress"),
    };
    const doc = generateInvoicePDF(
      lastSale,
      store,
      {
        invoice: t.pos.invoice,
        invoiceNo: t.pos.invoiceNo,
        date: t.pos.date,
        item: t.pos.item,
        qty: t.pos.qty,
        price: t.pos.price,
        lineTotal: t.pos.lineTotal,
        subtotal: t.pos.subtotal,
        discount: t.pos.discount,
        total: t.pos.total,
        thanks: t.pos.thanks,
        cash: t.pos.cash,
        card: t.pos.card,
        other: t.pos.other,
        paymentMethod: t.pos.paymentMethod,
      },
      formatPrice,
    );
    doc.save(`invoice-${lastSale.id.slice(-8)}.pdf`);
  };

  return (
    <div className="px-4 py-5 space-y-4">
      <h2 className="text-xl font-bold flex items-center gap-2">
        <ShoppingCart className="w-5 h-5 text-gold" />
        {t.pos.title}
      </h2>

      {/* Search + Scan */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 -translate-y-1/2 start-3 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.pos.search}
            className="ps-10"
          />
          {filtered.length > 0 && (
            <div className="absolute z-20 mt-1 w-full rounded-lg border bg-popover shadow-lg overflow-hidden">
              {filtered.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => addToCart(p)}
                  className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-accent/20 text-start"
                >
                  <div className="min-w-0">
                    <p className="font-medium truncate">{p.name}</p>
                    <p className="text-xs text-muted-foreground">
                      ×{p.quantity} · {p.barcode || "—"}
                    </p>
                  </div>
                  <span className="text-gold font-bold text-xs ms-2">
                    {formatPrice(p.salePrice)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
        <Button variant="gold" onClick={() => setScanOpen(true)} className="shrink-0">
          <ScanLine className="w-4 h-4" />
        </Button>
      </div>

      {/* Cart */}
      <div className="rounded-xl border bg-card shadow-elegant overflow-hidden">
        <div className="px-4 py-2.5 border-b flex items-center justify-between">
          <span className="text-sm font-semibold">{t.pos.cart}</span>
          <Badge variant="secondary">{cart.length}</Badge>
        </div>
        {cart.length === 0 ? (
          <div className="p-8 text-center">
            <ShoppingCart className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
            <p className="font-medium">{t.pos.emptyCart}</p>
            <p className="text-xs text-muted-foreground">{t.pos.emptyHint}</p>
          </div>
        ) : (
          <div className="divide-y">
            <AnimatePresence initial={false}>
              {cart.map((item) => (
                <motion.div
                  key={item.productId}
                  layout
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="p-3 flex items-center gap-2"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatPrice(item.unitPrice)} ×{item.quantity} ={" "}
                      <span className="text-gold font-semibold">
                        {formatPrice(item.unitPrice * item.quantity)}
                      </span>
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-7 w-7"
                      onClick={() => updateQty(item.productId, -1)}
                    >
                      <Minus className="w-3 h-3" />
                    </Button>
                    <span className="w-6 text-center text-sm font-semibold">
                      {item.quantity}
                    </span>
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-7 w-7"
                      onClick={() => updateQty(item.productId, 1)}
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-destructive"
                      onClick={() => removeItem(item.productId)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {cart.length > 0 && (
        <div className="rounded-xl border bg-card shadow-elegant p-4 space-y-3">
          <div>
            <Label className="text-xs">{t.pos.customerName}</Label>
            <Input
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="mt-1"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">{t.pos.discount}</Label>
              <Input
                type="number"
                inputMode="decimal"
                min="0"
                value={discount}
                onChange={(e) =>
                  setDiscount(Math.max(0, Number(e.target.value) || 0))
                }
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">{t.pos.paymentMethod}</Label>
              <Select
                value={paymentMethod}
                onValueChange={(v) => setPaymentMethod(v as "cash" | "card" | "other")}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">{t.pos.cash}</SelectItem>
                  <SelectItem value="card">{t.pos.card}</SelectItem>
                  <SelectItem value="other">{t.pos.other}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="pt-2 border-t space-y-1 text-sm">
            <Row label={t.pos.subtotal} value={formatPrice(subtotal)} />
            {discount > 0 && (
              <Row
                label={t.pos.discount}
                value={`- ${formatPrice(discount)}`}
                muted
              />
            )}
            <Row
              label={t.pos.total}
              value={formatPrice(total)}
              emphasized
            />
          </div>

          <Button variant="gold" size="lg" className="w-full" onClick={checkout}>
            <Receipt className="w-4 h-4" />
            {t.pos.pay}
          </Button>
        </div>
      )}

      <BarcodeScanner open={scanOpen} onOpenChange={setScanOpen} onDetected={handleScanned} />

      {/* Floating button: open product picker */}
      <Button
        variant="gold"
        size="icon"
        onClick={() => setPickerOpen(true)}
        className="fixed bottom-20 end-4 h-14 w-14 rounded-full shadow-gold z-30"
        aria-label="pick product"
      >
        <Plus className="w-6 h-6" />
      </Button>

      {/* Product picker dialog */}
      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="max-w-sm p-0 overflow-hidden">
          <DialogHeader className="px-4 pt-4">
            <DialogTitle>{t.pos.cart}</DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto divide-y">
            {products.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                {t.inventory.empty}
              </div>
            ) : (
              products.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  disabled={p.quantity <= 0}
                  onClick={() => {
                    addToCart(p);
                  }}
                  className="w-full flex items-center justify-between px-4 py-3 text-sm hover:bg-accent/20 text-start disabled:opacity-50"
                >
                  <div className="min-w-0">
                    <p className="font-medium truncate">{p.name}</p>
                    <p className="text-xs text-muted-foreground">
                      ×{p.quantity} · {p.barcode || "—"}
                    </p>
                  </div>
                  <span className="text-gold font-bold text-xs ms-2">
                    {formatPrice(p.salePrice)}
                  </span>
                </button>
              ))
            )}
          </div>
          <DialogFooter className="px-4 pb-4">
            <div className="w-full flex flex-col gap-2">
              {cart.length > 0 && (
                <Button
                  variant="gold"
                  onClick={() => setPickerOpen(false)}
                  className="w-full"
                >
                  <Receipt className="w-4 h-4" />
                  {t.form.save} ({cart.length})
                </Button>
              )}
              <Button variant="outline" onClick={() => setPickerOpen(false)} className="w-full">
                {t.activation.back}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receipt Dialog */}
      <Dialog open={receiptOpen} onOpenChange={setReceiptOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t.pos.saleSuccess}</DialogTitle>
          </DialogHeader>
          {lastSale && (
            <div className="space-y-2 text-sm">
              <Row
                label={t.pos.invoiceNo}
                value={lastSale.id.slice(-8).toUpperCase()}
              />
              <Row label={t.pos.total} value={formatPrice(lastSale.total)} emphasized />
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setReceiptOpen(false)}>
              <X className="w-4 h-4" />
            </Button>
            <Button variant="gold" onClick={printReceipt}>
              <Printer className="w-4 h-4" />
              {t.pos.printInvoice}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({
  label,
  value,
  emphasized,
  muted,
}: {
  label: string;
  value: string;
  emphasized?: boolean;
  muted?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between",
        emphasized && "text-base pt-1",
        muted && "text-muted-foreground",
      )}
    >
      <span>{label}</span>
      <span
        className={cn(
          "font-semibold",
          emphasized && "text-gold text-lg font-bold",
        )}
      >
        {value}
      </span>
    </div>
  );
}
