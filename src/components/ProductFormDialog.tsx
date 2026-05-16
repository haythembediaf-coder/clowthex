import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { newId, saveProduct, type Product } from "@/lib/db";
import { useApp } from "@/contexts/AppContext";
import { toast } from "sonner";
import { ImagePlus, ScanLine, Wand2, Printer } from "lucide-react";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { BarcodePreview } from "@/components/BarcodePreview";
import { generateBarcodeValue, printBarcode } from "@/lib/barcode";

const CATEGORIES = ["shirts", "pants", "shoes", "jackets", "accessories", "other"] as const;

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  product: Product | null;
  onSaved: () => void;
}

const empty = (): Product => ({
  id: newId(),
  name: "",
  category: "shirts",
  size: "",
  color: "",
  purchasePrice: 0,
  salePrice: 0,
  quantity: 0,
  lowStockThreshold: 5,
  image: "",
  barcode: "",
  createdAt: Date.now(),
  updatedAt: Date.now(),
});

export function ProductFormDialog({ open, onOpenChange, product, onSaved }: Props) {
  const { t } = useApp();
  const [form, setForm] = useState<Product>(empty());
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [scanOpen, setScanOpen] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(product ? { ...product } : empty());
      setError(null);
    }
  }, [open, product]);

  const update = <K extends keyof Product>(k: K, v: Product[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => update("image", reader.result as string);
    reader.readAsDataURL(file);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError(t.form.required);
      return;
    }
    await saveProduct({ ...form, updatedAt: Date.now() });
    toast.success(t.form.saved);
    onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {product ? t.inventory.editProduct : t.inventory.addProduct}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-3">
          {/* Image */}
          <div>
            <Label className="text-xs">{t.form.image}</Label>
            <div className="mt-1 flex items-center gap-3">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-20 h-20 rounded-lg border-2 border-dashed border-border hover:border-gold transition-smooth grid place-items-center bg-muted/40 overflow-hidden"
              >
                {form.image ? (
                  <img
                    src={form.image}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <ImagePlus className="w-6 h-6 text-muted-foreground" />
                )}
              </button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileRef.current?.click()}
              >
                {form.image ? t.form.changeImage : t.form.pickImage}
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                hidden
                onChange={handleImage}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="name" className="text-xs">
              {t.form.name} *
            </Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              autoFocus
            />
            {error && <p className="text-xs text-destructive mt-1">{error}</p>}
          </div>

          <div>
            <Label className="text-xs">{t.form.category}</Label>
            <Select
              value={form.category}
              onValueChange={(v) => update("category", v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {t.categories[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">{t.form.size}</Label>
              <Input
                value={form.size ?? ""}
                onChange={(e) => update("size", e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs">{t.form.color}</Label>
              <Input
                value={form.color ?? ""}
                onChange={(e) => update("color", e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">{t.form.purchasePrice}</Label>
              <Input
                type="number"
                inputMode="decimal"
                min="0"
                value={form.purchasePrice}
                onChange={(e) =>
                  update("purchasePrice", Number(e.target.value) || 0)
                }
              />
            </div>
            <div>
              <Label className="text-xs">{t.form.salePrice}</Label>
              <Input
                type="number"
                inputMode="decimal"
                min="0"
                value={form.salePrice}
                onChange={(e) =>
                  update("salePrice", Number(e.target.value) || 0)
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">{t.form.quantity}</Label>
              <Input
                type="number"
                inputMode="numeric"
                min="0"
                value={form.quantity}
                onChange={(e) =>
                  update("quantity", Math.max(0, Number(e.target.value) || 0))
                }
              />
            </div>
            <div>
              <Label className="text-xs">{t.form.lowStockThreshold}</Label>
              <Input
                type="number"
                inputMode="numeric"
                min="0"
                value={form.lowStockThreshold}
                onChange={(e) =>
                  update(
                    "lowStockThreshold",
                    Math.max(0, Number(e.target.value) || 0),
                  )
                }
              />
            </div>
          </div>

          <div>
            <Label className="text-xs">{t.form.barcode}</Label>
            <div className="flex gap-2 mt-1">
              <Input
                value={form.barcode ?? ""}
                onChange={(e) => update("barcode", e.target.value)}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                title={t.form.scan}
                onClick={() => setScanOpen(true)}
              >
                <ScanLine className="w-4 h-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                title={t.form.generate}
                onClick={() => update("barcode", generateBarcodeValue())}
              >
                <Wand2 className="w-4 h-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                title={t.form.printBarcode}
                disabled={!form.barcode}
                onClick={() => form.barcode && printBarcode(form.barcode, form.name || "—")}
              >
                <Printer className="w-4 h-4" />
              </Button>
            </div>
            {form.barcode && (
              <div className="mt-2 bg-white rounded-md p-2 flex justify-center">
                <BarcodePreview value={form.barcode} />
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t.form.cancel}
            </Button>
            <Button type="submit" variant="gold">
              {t.form.save}
            </Button>
          </DialogFooter>
        </form>
        <BarcodeScanner
          open={scanOpen}
          onOpenChange={setScanOpen}
          onDetected={(code) => update("barcode", code)}
        />
      </DialogContent>
    </Dialog>
  );
}