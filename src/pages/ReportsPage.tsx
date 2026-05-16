import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TrendingUp, DollarSign, ShoppingBag, BarChart3, Receipt } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { getAllSales, type Sale } from "@/lib/db";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type Period = "today" | "week" | "month" | "year";

export function ReportsPage() {
  const { t, formatPrice, lang } = useApp();
  const [sales, setSales] = useState<Sale[]>([]);
  const [period, setPeriod] = useState<Period>("month");

  useEffect(() => {
    (async () => setSales(await getAllSales()))();
  }, []);

  const filtered = useMemo(() => {
    const now = new Date();
    const start = new Date(now);
    if (period === "today") start.setHours(0, 0, 0, 0);
    else if (period === "week") start.setDate(now.getDate() - 6);
    else if (period === "month") start.setDate(now.getDate() - 29);
    else start.setDate(now.getDate() - 364);
    start.setHours(0, 0, 0, 0);
    const from = start.getTime();
    return sales
      .filter((s) => s.createdAt >= from)
      .sort((a, b) => a.createdAt - b.createdAt);
  }, [sales, period]);

  const stats = useMemo(() => {
    const revenue = filtered.reduce((s, x) => s + x.total, 0);
    const profit = filtered.reduce((s, x) => s + x.profit, 0);
    const count = filtered.length;
    const avg = count > 0 ? revenue / count : 0;
    return { revenue, profit, count, avg };
  }, [filtered]);

  const chartData = useMemo(() => {
    const days = period === "today" ? 1 : period === "week" ? 7 : period === "month" ? 30 : 365;
    const buckets: Record<string, { label: string; revenue: number; profit: number }> = {};
    const locale = lang === "ar" ? "ar-DZ" : lang;
    const useMonth = period === "year";
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      const key = useMonth
        ? `${d.getFullYear()}-${d.getMonth()}`
        : d.toISOString().slice(0, 10);
      const label = useMonth
        ? d.toLocaleDateString(locale, { month: "short" })
        : d.toLocaleDateString(locale, { day: "2-digit", month: "2-digit" });
      if (!buckets[key]) buckets[key] = { label, revenue: 0, profit: 0 };
    }
    for (const s of filtered) {
      const d = new Date(s.createdAt);
      d.setHours(0, 0, 0, 0);
      const key = useMonth
        ? `${d.getFullYear()}-${d.getMonth()}`
        : d.toISOString().slice(0, 10);
      if (buckets[key]) {
        buckets[key].revenue += s.total;
        buckets[key].profit += s.profit;
      }
    }
    return Object.values(buckets);
  }, [filtered, period, lang]);

  const topProducts = useMemo(() => {
    const map = new Map<string, { name: string; qty: number; revenue: number }>();
    for (const s of filtered) {
      for (const it of s.items) {
        const cur = map.get(it.productId) ?? { name: it.name, qty: 0, revenue: 0 };
        cur.qty += it.quantity;
        cur.revenue += it.unitPrice * it.quantity;
        map.set(it.productId, cur);
      }
    }
    return [...map.values()].sort((a, b) => b.qty - a.qty).slice(0, 5);
  }, [filtered]);

  const recent = useMemo(
    () => [...filtered].sort((a, b) => b.createdAt - a.createdAt).slice(0, 8),
    [filtered],
  );

  return (
    <div className="px-4 py-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-gold" />
          {t.reports.title}
        </h2>
        <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <SelectTrigger className="w-32 h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">{t.reports.today}</SelectItem>
            <SelectItem value="week">{t.reports.week}</SelectItem>
            <SelectItem value="month">{t.reports.month}</SelectItem>
            <SelectItem value="year">{t.reports.year}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3">
        <Kpi
          icon={<DollarSign className="w-4 h-4" />}
          label={t.reports.revenue}
          value={formatPrice(stats.revenue)}
          gold
        />
        <Kpi
          icon={<TrendingUp className="w-4 h-4" />}
          label={t.reports.profit}
          value={formatPrice(stats.profit)}
          success
        />
        <Kpi
          icon={<ShoppingBag className="w-4 h-4" />}
          label={t.reports.salesCount}
          value={stats.count.toString()}
        />
        <Kpi
          icon={<Receipt className="w-4 h-4" />}
          label={t.reports.avgSale}
          value={formatPrice(stats.avg)}
        />
      </div>

      {/* Chart */}
      <div className="rounded-xl border bg-card p-4 shadow-elegant">
        <p className="text-sm font-semibold mb-3">{t.reports.chartSales}</p>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ left: -20, right: 4, top: 4, bottom: 0 }}>
              <defs>
                <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--gold))" stopOpacity={0.5} />
                  <stop offset="95%" stopColor="hsl(var(--gold))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gProf" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} width={50} />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(v: number) => formatPrice(v)}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="hsl(var(--gold))"
                strokeWidth={2}
                fill="url(#gRev)"
                name={t.reports.revenue}
              />
              <Area
                type="monotone"
                dataKey="profit"
                stroke="hsl(var(--success))"
                strokeWidth={2}
                fill="url(#gProf)"
                name={t.reports.profit}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top products */}
      <div className="rounded-xl border bg-card p-4 shadow-elegant">
        <p className="text-sm font-semibold mb-3">{t.reports.topProducts}</p>
        {topProducts.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            {t.reports.noSales}
          </p>
        ) : (
          <div className="space-y-2">
            {topProducts.map((p, i) => {
              const max = topProducts[0].qty || 1;
              const pct = (p.qty / max) * 100;
              return (
                <div key={i}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="truncate font-medium">{p.name}</span>
                    <span className="text-gold font-semibold whitespace-nowrap ms-2">
                      {p.qty} {t.reports.units}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-gradient-gold rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent sales */}
      <div className="rounded-xl border bg-card p-4 shadow-elegant">
        <p className="text-sm font-semibold mb-3">{t.reports.recentSales}</p>
        {recent.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            {t.reports.noSales}
          </p>
        ) : (
          <div className="divide-y">
            {recent.map((s) => (
              <div key={s.id} className="py-2 flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    #{s.id.slice(-6).toUpperCase()}
                    {s.customerName && (
                      <span className="text-muted-foreground font-normal">
                        {" · "}
                        {s.customerName}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(s.createdAt).toLocaleString(
                      lang === "ar" ? "ar-DZ" : lang,
                    )}{" "}
                    · {s.items.length} × {t.reports.units}
                  </p>
                </div>
                <span className="text-gold font-bold text-sm">
                  {formatPrice(s.total)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Kpi({
  icon,
  label,
  value,
  gold,
  success,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  gold?: boolean;
  success?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-card p-3 shadow-elegant",
        gold && "border-gold/40",
        success && "border-success/40",
      )}
    >
      <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
        <span
          className={cn(
            "w-6 h-6 rounded-md grid place-items-center",
            gold
              ? "bg-gold/15 text-gold"
              : success
              ? "bg-success/15 text-success"
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
          success && "text-success",
        )}
      >
        {value}
      </p>
    </div>
  );
}
