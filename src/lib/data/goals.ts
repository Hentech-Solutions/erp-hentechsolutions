import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { rpc } from "@/lib/data/rpc";

export type GoalPeriod = "weekly" | "monthly" | "quarterly";

/**
 * Como o realizado da meta é calculado:
 *  - `revenue`: soma toda receita do Centro Financeiro no período, por
 *    competência. Atualiza sozinha — pedido concluído, venda avulsa ou
 *    lançamento manual entram automaticamente.
 *  - `product`: soma as vendas do produto vinculado.
 *  - `manual`: soma apenas o que for digitado em "Lançar venda".
 */
export type GoalType = "revenue" | "product" | "manual";

export const GOAL_TYPE_LABEL: Record<GoalType, string> = {
  revenue: "Faturamento",
  product: "Por produto",
  manual: "Lançamento manual",
};

export const GOAL_TYPE_HINT: Record<GoalType, string> = {
  revenue: "Acompanha toda a receita do período automaticamente.",
  product: "Soma as vendas do produto vinculado.",
  manual: "Só conta o que você lançar na mão.",
};

/** Metas que se alimentam sozinhas não têm lançamento manual. */
export const isAutoGoal = (t: GoalType) => t === "revenue" || t === "product";

export type SalesGoal = Database["public"]["Tables"]["sales_goals"]["Row"] & {
  product_id?: string | null;
  goal_start_date?: string | null;
  realized_value?: number | null;
  goal_type?: GoalType;
  products?: { id: string; name: string } | null;
};
export type SalesEntry = Database["public"]["Tables"]["sales_entries"]["Row"];
export type SalesGoalInsert = Database["public"]["Tables"]["sales_goals"]["Insert"];

export type GoalWithProgress = SalesGoal & {
  real_value: number;
  pct: number;
  status: "success" | "warning" | "danger";
  product_name?: string | null;
  goal_type: GoalType;
};

export function statusFor(pct: number): "success" | "warning" | "danger" {
  if (pct >= 100) return "success";
  if (pct >= 70) return "warning";
  return "danger";
}

/** Current period range based on today. */
export function currentRange(period: GoalPeriod): { from: string; to: string } {
  const now = new Date();
  let start: Date;
  let end: Date;
  if (period === "weekly") {
    const day = now.getDay(); // 0 sun .. 6 sat
    const diffToMonday = (day + 6) % 7;
    start = new Date(now);
    start.setDate(now.getDate() - diffToMonday);
    end = new Date(start);
    end.setDate(start.getDate() + 6);
  } else if (period === "monthly") {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
    end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  } else {
    const q = Math.floor(now.getMonth() / 3);
    start = new Date(now.getFullYear(), q * 3, 1);
    end = new Date(now.getFullYear(), q * 3 + 3, 0);
  }
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return { from: iso(start), to: iso(end) };
}

/** List all goals (optionally filter to period type). */
export async function listGoals(periodType?: GoalPeriod): Promise<GoalWithProgress[]> {
  let q = supabase
    .from("sales_goals")
    .select("*, products(id, name)")
    .order("start_date", { ascending: false });
  if (periodType) q = q.eq("period_type", periodType);
  const { data, error } = await q;
  if (error) throw error;
  const goals = (data ?? []) as any[];
  return goals.map((g) => {
    const real = Number(g.realized_value ?? 0);
    const target = Number(g.target_value);
    const pct = target > 0 ? (real / target) * 100 : 0;
    return {
      ...g,
      real_value: real,
      pct,
      status: statusFor(pct),
      product_name: g.products?.name ?? null,
      goal_type: (g.goal_type ?? (g.product_id ? "product" : "manual")) as GoalType,
    };
  });
}

/** KPIs for the active period type, aggregating goals overlapping current period. */
export async function getPeriodMetrics(periodType: GoalPeriod) {
  const range = currentRange(periodType);
  const { data: goals, error } = await supabase
    .from("sales_goals")
    .select("*")
    .eq("period_type", periodType)
    .lte("start_date", range.to)
    .gte("end_date", range.from);
  if (error) throw error;
  const target = (goals ?? []).reduce((s, g) => s + Number(g.target_value), 0);
  const real = (goals ?? []).reduce((s, g: any) => s + Number(g.realized_value ?? 0), 0);
  const pct = target > 0 ? (real / target) * 100 : 0;
  return { real, target, pct, status: statusFor(pct), range };
}

/**
 * Série meta × realizado por mês.
 *
 * Agregado no Postgres porque a versão anterior lia só `sales_entries`: uma
 * meta de faturamento apareceria zerada no gráfico do dashboard mesmo com o
 * card cheio, já que a receita dela vem de `financial_entries`.
 */
export async function getGoalVsRealSeries(periodType: GoalPeriod) {
  const rows = await rpc<Array<{ month: string; meta: number; real_value: number }>>(
    "get_goal_vs_real_series",
    { _period_type: periodType, _months: periodType === "weekly" ? 3 : 6 },
  );
  return (rows ?? []).map((r) => ({
    date: r.month,
    meta: Number(r.meta),
    real: Number(r.real_value),
  }));
}

/** Progress per category for active period type goals overlapping current period. */
export async function getProgressByCategory(periodType: GoalPeriod) {
  const goals = await listGoals(periodType);
  const map = new Map<string, { category: string; target: number; real: number }>();
  for (const g of goals) {
    const cur = map.get(g.category) ?? { category: g.category, target: 0, real: 0 };
    cur.target += Number(g.target_value);
    cur.real += g.real_value;
    map.set(g.category, cur);
  }
  return Array.from(map.values())
    .map((c) => {
      const pct = c.target > 0 ? (c.real / c.target) * 100 : 0;
      return { ...c, pct, status: statusFor(pct) };
    })
    .sort((a, b) => b.pct - a.pct);
}

/** Quarterly accumulated by week vs quarterly target. */
export async function getQuarterlyWeeklyAccum() {
  const range = currentRange("quarterly");
  const { data: goals } = await supabase
    .from("sales_goals")
    .select("id, target_value")
    .eq("period_type", "quarterly")
    .lte("start_date", range.to)
    .gte("end_date", range.from);

  const target = (goals ?? []).reduce((s, g) => s + Number(g.target_value), 0);
  const goalIds = (goals ?? []).map((g) => g.id);

  let entries: { amount: number; sale_date: string }[] = [];
  if (goalIds.length > 0) {
    const { data } = await supabase
      .from("sales_entries")
      .select("amount, sale_date")
      .in("goal_id", goalIds)
      .gte("sale_date", range.from)
      .lte("sale_date", range.to);
    entries = (data ?? []).map((r) => ({ amount: Number(r.amount), sale_date: r.sale_date }));
  }

  // build weeks
  const start = new Date(range.from);
  const end = new Date(range.to);
  const weeks: { label: string; from: Date; to: Date }[] = [];
  let cursor = new Date(start);
  let idx = 1;
  while (cursor <= end) {
    const wEnd = new Date(cursor);
    wEnd.setDate(cursor.getDate() + 6);
    if (wEnd > end) wEnd.setTime(end.getTime());
    weeks.push({ label: `S${idx}`, from: new Date(cursor), to: new Date(wEnd) });
    cursor.setDate(cursor.getDate() + 7);
    idx++;
  }

  let acc = 0;
  return weeks.map((w) => {
    const weekTotal = entries
      .filter((e) => {
        const d = new Date(e.sale_date);
        return d >= w.from && d <= w.to;
      })
      .reduce((s, e) => s + e.amount, 0);
    acc += weekTotal;
    return { week: w.label, real: weekTotal, acumulado: acc, meta: target };
  });
}

export async function createGoal(input: SalesGoalInsert) {
  const { data, error } = await supabase.from("sales_goals").insert(input).select().single();
  if (error) throw error;
  return data;
}

export async function updateGoal(id: string, patch: Partial<SalesGoalInsert>) {
  const { data, error } = await supabase
    .from("sales_goals")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteGoal(id: string) {
  const { error } = await supabase.from("sales_goals").delete().eq("id", id);
  if (error) throw error;
}

export async function addSaleEntry(input: {
  goal_id: string;
  amount: number;
  sale_date: string;
  note?: string | null;
  product_id?: string | null;
}) {
  const { data, error } = await supabase.from("sales_entries").insert(input).select().single();
  if (error) throw error;
  return data;
}

/** Find a goal linked to a product (active = end_date >= today by default). */
export async function findGoalByProduct(productId: string, opts: { activeOnly?: boolean } = {}) {
  let q = supabase.from("sales_goals").select("*").eq("product_id", productId).limit(1);
  if (opts.activeOnly !== false) q = q.gte("end_date", new Date().toISOString().slice(0, 10));
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? [])[0] ?? null;
}
