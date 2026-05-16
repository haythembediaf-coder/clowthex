import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Search,
  Package,
  AlertTriangle,
  Pencil,
  Trash2,
  ArrowUpDown,
  ImageOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Badge } from "@/components/ui/badge";
import { useApp } from "@/contexts/AppContext";
import {
  type Product,
  deleteProduct,
  getAllProducts,
} from "@/lib/db";
import { ProductFormDialog } from "@/components/ProductFormDialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const CATEGORY_KEYS = [
  "shirts",
  "pants",
  "shoes",
  "jackets",
  "accessories",
  "other",
] as const;

type SortKey = "name" | "salePrice" | "quantity";
type SortDir = "asc" | "desc";

export function InventoryPage() {
  const { t, formatPrice } = useApp();
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const refresh = async () => {
    const all = await getAllProducts();
    setProducts(all);
  };

  useEffect(() => {
    refresh();
  }, []);

  const filtered = useMemo(() => {
    let arr = products;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      arr = arr.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.barcode?.toLowerCase().includes(q) ||
          p.color?.toLowerCase().includes(q),
      );
    }
    if (category !== "all") arr = arr.filter((p) => p.category === category);
    arr = [...arr].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") cmp = a.name.localeCompare(b.name);
      else cmp = (a[sortKey] as number) - (b[sortKey] as number);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [products, search, category, sortKey, sortDir]);

  const stats = useMemo(() => {
    const totalUnits = products.reduce((s, p) => s + p.quantity, 0);
    const value = products.reduce(
      (s, p) => s + p.purchasePrice * p.quantity,
      0,
    );
    const low = products.filter(
      (p) => p.quantity <= p.lowStockThreshold,
    ).length;
    return {
      products: products.length,
      units: totalUnits,
      value,
      low,
    };
  }, [products]);

  const handleAdd = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const handleEdit = (p: Product) => {
    setEditing(p);
    setFormOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    await deleteProduct(deleteId);
    setDeleteId(null);
    toast.success(t.form.deleted);
    refresh();
  };

  return (
    <div className="px-4 py-5 space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          icon={<Package className="w-4 h-4" />}
          label={t.inventory.stats.products}
          value={stats.products.toString()}
        />
        <StatCard
          icon={<Package className="w-4 h-4" />}
          label={t.inventory.stats.units}
          value={stats.units.toString()}
        />
        <StatCard
          icon={<span className="text-gold">$</span>}
          label={t.inventory.stats.value}
          value={formatPrice(stats.value)}
          gold
        />
        <StatCard
          icon={<AlertTriangle className="w-4 h-4" />}
          label={t.inventory.stats.lowStock}
          value={stats.low.toString()}
          warning={stats.low > 0}
        />
      </div>

      {/* Search + add */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 -translate-y-1/2 start-3 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.inventory.search}
            className="ps-10"
          />
        </div>
        <Button variant="gold" onClick={handleAdd} className="shrink-0">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">{t.inventory.addProduct}</span>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="flex-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.inventory.allCategories}</SelectItem>
            {CATEGORY_KEYS.map((k) => (
              <SelectItem key={k} value={k}>
                {t.categories[k]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
          <SelectTrigger className="flex-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">{t.inventory.sortName}</SelectItem>
            <SelectItem value="salePrice">{t.inventory.sortPrice}</SelectItem>
            <SelectItem value="quantity">{t.inventory.sortQty}</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setSortDir(sortDir === "asc" ? "desc" : "asc")}
          aria-label={sortDir === "asc" ? t.inventory.asc : t.inventory.desc}
          className="shrink-0"
        >
          <ArrowUpDown
            className={cn(
              "w-4 h-4 transition-transform",
              sortDir === "desc" && "rotate-180",
            )}
          />
        </Button>
      </div>

      {/* List */}
      {products.length === 0 ? (
        <EmptyState
          title={t.inventory.empty}
          hint={t.inventory.emptyHint}
          onAdd={handleAdd}
          addLabel={t.inventory.addProduct}
        />
      ) : filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">
          {t.inventory.noResults}
        </p>
      ) : (
        <div className="space-y-2.5">
          <AnimatePresence initial={false}>
            {filtered.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                onEdit={() => handleEdit(p)}
                onDelete={() => setDeleteId(p.id)}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      <ProductFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        product={editing}
        onSaved={refresh}
      />

      <AlertDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.form.confirmDelete}</AlertDialogTitle>
            <AlertDialogDescription />
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.form.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t.form.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  gold,
  warning,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  gold?: boolean;
  warning?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-card p-3 shadow-elegant transition-smooth",
        gold && "border-gold/40",
        warning && "border-warning/50",
      )}
    >
      <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
        <span
          className={cn(
            "w-6 h-6 rounded-md grid place-items-center",
            gold
              ? "bg-gold/15 text-gold"
              : warning
              ? "bg-warning/15 text-warning"
              : "bg-muted",
          )}
        >
          {icon}
        </span>
        {label}
      </div>
      <p
        className={cn(
          "text-lg font-bold truncate",
          gold && "text-gold",
          warning && "text-warning",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function ProductCard({
  product,
  onEdit,
  onDelete,
}: {
  product: Product;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { t, formatPrice } = useApp();
  const isOut = product.quantity === 0;
  const isLow = !isOut && product.quantity <= product.lowStockThreshold;
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "rounded-xl border bg-card p-3 shadow-elegant flex gap-3 transition-smooth",
        isOut && "border-destructive/50",
        isLow && "border-warning/50",
      )}
    >
      <div className="w-16 h-16 rounded-lg bg-muted shrink-0 overflow-hidden grid place-items-center">
        {product.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <ImageOff className="w-6 h-6 text-muted-foreground" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-sm truncate">{product.name}</h3>
          <span className="text-gold font-bold text-sm whitespace-nowrap">
            {formatPrice(product.salePrice)}
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5 mt-1">
          <Badge variant="secondary" className="text-[10px] h-5">
            {t.categories[product.category as keyof typeof t.categories] ??
              product.category}
          </Badge>
          {product.size && (
            <Badge variant="outline" className="text-[10px] h-5">
              {product.size}
            </Badge>
          )}
          {product.color && (
            <Badge variant="outline" className="text-[10px] h-5">
              {product.color}
            </Badge>
          )}
        </div>
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-2 text-xs">
            <span
              className={cn(
                "font-semibold",
                isOut
                  ? "text-destructive"
                  : isLow
                  ? "text-warning"
                  : "text-foreground",
              )}
            >
              ×{product.quantity}
            </span>
            {isOut && (
              <span className="text-[10px] text-destructive">
                {t.inventory.outOfStock}
              </span>
            )}
            {isLow && (
              <span className="text-[10px] text-warning">
                {t.inventory.lowStock}
              </span>
            )}
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onEdit}
            >
              <Pencil className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={onDelete}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function EmptyState({
  title,
  hint,
  onAdd,
  addLabel,
}: {
  title: string;
  hint: string;
  onAdd: () => void;
  addLabel: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      <div className="w-20 h-20 rounded-2xl bg-muted grid place-items-center mb-4">
        <Package className="w-10 h-10 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-bold mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground mb-6">{hint}</p>
      <Button variant="gold" onClick={onAdd}>
        <Plus className="w-4 h-4" />
        {addLabel}
      </Button>
    </div>
  );
}