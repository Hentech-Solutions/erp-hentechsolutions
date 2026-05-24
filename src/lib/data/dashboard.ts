import { supabase } from "@/integrations/supabase/client";
import type { Period } from "@/lib/periods";
import { previousPeriod } from "@/lib/periods";

type EntryRow = {
  type: "revenue" | "expense" | "investment" | "withdrawal" | "capital_in";
  amount: number;
  reference_date: string;
  category_id: string | null;
};

async function fetchEntries(p: Period): Promise<EntryRow[]> {
  const { data, error } = await supabase
    .from("financial_entries")
    .select("type, amount, reference_date, category_id")
    .is("deleted_at", null)
    .gte("reference_date", p.from)
    .lte("reference_date", p.to);
  if (error) throw error;
  return (data ?? []).map((r) => ({ ...r, amount: Number(r.amount) })) as EntryRow[];
}

export async function getKpis(p: Period) {
  const [curr, prev] = await Promise.all([fetchEntries(p), fetchEntries(previousPeriod(p))]);
  const agg = (rows: EntryRow[]) => {
    const revenue = rows.filter((r) => r.type === "revenue").reduce((s, r) => s + r.amount, 0);
    const expense = rows.filter((r) => r.type === "expense").reduce((s, r) => s + r.amount, 0);
    const capIn = rows
      .filter((r) => r.type === "capital_in" || r.type === "investment")
      .reduce((s, r) => s + r.amount, 0);
    const withdrawal = rows.filter((r) => r.type === "withdrawal").reduce((s, r) => s + r.amount, 0);
    const salesCount = rows.filter((r) => r.type === "revenue").length;
    return {
      revenue,
      expense,
      capIn,
      withdrawal,
      profit: revenue - expense,
      cash: revenue + capIn - expense - withdrawal,
      salesCount,
      ticket: salesCount > 0 ? revenue / salesCount : 0,
    };
  };
  const c = agg(curr);
  const pv = agg(prev);
  const delta = (a: number, b: number) => (b === 0 ? (a > 0 ? 100 : 0) : ((a - b) / Math.abs(b)) * 100);

  const { data: products } = await supabase
    .from("products")
    .select("margin")
    .eq("status", "active")
    .is("deleted_at", null);
  const margins = (products ?? []).map((p) => Number(p.margin ?? 0));
  const avgMargin = margins.length ? margins.reduce((s, m) => s + m, 0) / margins.length : 0;

  return {
    revenue: { value: c.revenue, delta: delta(c.revenue, pv.revenue) },
    profit: { value: c.profit, delta: delta(c.profit, pv.profit) },
    cash: { value: c.cash, delta: delta(c.cash, pv.cash) },
    salesCount: { value: c.salesCount, delta: delta(c.salesCount, pv.salesCount) },
    ticket: { value: c.ticket, delta: delta(c.ticket, pv.ticket) },
    avgMargin: { value: avgMargin, delta: 0 },
  };
}

export async function getRevenueSeries(p: Period) {
  const rows = await fetchEntries(p);
  const byMonth = new Map<string, { revenue: number; expense: number }>();
  for (const r of rows) {
    const key = r.reference_date.slice(0, 7) + "-01";
    const e = byMonth.get(key) ?? { revenue: 0, expense: 0 };
    if (r.type === "revenue") e.revenue += r.amount;
    if (r.type === "expense") e.expense += r.amount;
    byMonth.set(key, e);
  }
  return Array.from(byMonth.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ date, ...v }));
}

export async function getCashFlowSeries(p: Period) {
  const rows = await fetchEntries(p);
  const byMonth = new Map<string, { in: number; out: number }>();
  for (const r of rows) {
    const key = r.reference_date.slice(0, 7) + "-01";
    const e = byMonth.get(key) ?? { in: 0, out: 0 };
    if (r.type === "revenue" || r.type === "capital_in" || r.type === "investment") e.in += r.amount;
    if (r.type === "expense" || r.type === "withdrawal") e.out += r.amount;
    byMonth.set(key, e);
  }
  let acc = 0;
  return Array.from(byMonth.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => {
      acc += v.in - v.out;
      return { date, in: v.in, out: v.out, balance: acc };
    });
}

export async function getExpenseBreakdown(p: Period) {
  const { data, error } = await supabase
    .from("financial_entries")
    .select("amount, category_id, financial_categories(name, color)")
    .is("deleted_at", null)
    .eq("type", "expense")
    .gte("reference_date", p.from)
    .lte("reference_date", p.to);
  if (error) throw error;
  const map = new Map<string, { name: string; color: string; amount: number }>();
  for (const r of data ?? []) {
    const cat: any = r.financial_categories;
    const name = cat?.name ?? "Sem categoria";
    const color = cat?.color ?? "#6b7280";
    const k = name;
    const e = map.get(k) ?? { name, color, amount: 0 };
    e.amount += Number(r.amount);
    map.set(k, e);
  }
  const all = Array.from(map.values()).sort((a, b) => b.amount - a.amount);
  const total = all.reduce((s, x) => s + x.amount, 0);
  return all.slice(0, 5).map((x) => ({ ...x, percentage: total > 0 ? (x.amount / total) * 100 : 0 }));
}

export async function getAlerts(p: Period) {
  const alerts: Array<{ severity: "info" | "warning" | "critical"; title: string; message: string }> = [];
  const cf = await getCashFlowSeries(p);
  const lastBal = cf.at(-1)?.balance ?? 0;
  if (lastBal < 0) {
    alerts.push({
      severity: "critical",
      title: "Fluxo de caixa negativo",
      message: `Saldo acumulado do período: R$ ${lastBal.toFixed(2)}`,
    });
  }
  const { data: products } = await supabase
    .from("products")
    .select("id, name, margin")
    .eq("status", "active")
    .is("deleted_at", null);
  for (const p of products ?? []) {
    if (Number(p.margin ?? 0) < 10) {
      alerts.push({
        severity: "warning",
        title: `Margem baixa: ${p.name}`,
        message: `Margem atual de ${Number(p.margin).toFixed(1)}%`,
      });
    }
  }
  return alerts.slice(0, 6);
}
