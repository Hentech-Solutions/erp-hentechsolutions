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

export type GoalsOverview = {
  goalCount: number;
  target: number;
  real: number;
  pct: number;
  status: "success" | "warning" | "danger";
  /** Quanto do período já passou, em %. */
  elapsedPct: number;
  /** Onde o realizado deveria estar agora, no ritmo linear. */
  expectedByNow: number;
  /** Positivo = adiantado em relação ao ritmo necessário. */
  paceDiff: number;
  categories: Array<{ category: string; target: number; real: number; pct: number }>;
};

/**
 * Visão de metas para um intervalo de datas.
 *
 * Antes o KPI "% atingido" filtrava metas que cruzam o período corrente
 * enquanto o gráfico por categoria pegava TODAS as metas do tipo — os dois
 * discordavam por construção. Agora ambos saem desta chamada.
 */
export async function getGoalsOverview(from: string, to: string): Promise<GoalsOverview> {
  const d = await rpc<Record<string, unknown>>("get_goals_overview", { _from: from, _to: to });
  const pct = Number(d.pct ?? 0);
  return {
    goalCount: Number(d.goal_count ?? 0),
    target: Number(d.target ?? 0),
    real: Number(d.real ?? 0),
    pct,
    status: statusFor(pct),
    elapsedPct: Number(d.elapsed_pct ?? 0),
    expectedByNow: Number(d.expected_by_now ?? 0),
    paceDiff: Number(d.pace_diff ?? 0),
    categories: ((d.categories ?? []) as Array<Record<string, unknown>>).map((c) => ({
      category: String(c.category),
      target: Number(c.target ?? 0),
      real: Number(c.real ?? 0),
      pct: Number(c.pct ?? 0),
    })),
  };
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

/**
 * Série meta × realizado acumulado dentro do período selecionado.
 *
 * Substitui `getQuarterlyWeeklyAccum`, que era sempre trimestral (ignorava a
 * aba escolhida) e lia só `sales_entries` — uma meta de faturamento aparecia
 * zerada ali mesmo com o card cheio.
 */
export async function getGoalPaceSeries(from: string, to: string) {
  const rows = await rpc<Array<{ month: string; meta: number; real_value: number }>>(
    "get_goal_vs_real_series",
    { _period_type: "monthly", _months: 6 },
  );
  const series = (rows ?? []).filter((r) => r.month >= from.slice(0, 7) && r.month <= to);
  let accReal = 0;
  let accMeta = 0;
  return series.map((r) => {
    accReal += Number(r.real_value);
    accMeta += Number(r.meta);
    return { date: r.month, real: accReal, meta: accMeta };
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
