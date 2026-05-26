import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type GoalPeriod = "weekly" | "monthly" | "quarterly";
export type SalesGoal = Database["public"]["Tables"]["sales_goals"]["Row"];
export type SalesEntry = Database["public"]["Tables"]["sales_entries"]["Row"];
export type SalesGoalInsert = Database["public"]["Tables"]["sales_goals"]["Insert"];

export type GoalWithProgress = SalesGoal & {
  real_value: number;
  pct: number;
  status: "success" | "warning" | "danger";
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

async function getEntriesByGoals(goalIds: string[]): Promise<Record<string, number>> {
  if (goalIds.length === 0) return {};
  const { data, error } = await supabase
    .from("sales_entries")
    .select("goal_id, amount")
    .in("goal_id", goalIds);
  if (error) throw error;
  const map: Record<string, number> = {};
  for (const r of data ?? []) {
    map[r.goal_id] = (map[r.goal_id] ?? 0) + Number(r.amount);
  }
  return map;
}

/** List all goals (optionally filter to period type). */
export async function listGoals(periodType?: GoalPeriod): Promise<GoalWithProgress[]> {
  let q = supabase.from("sales_goals").select("*").order("start_date", { ascending: false });
  if (periodType) q = q.eq("period_type", periodType);
  const { data, error } = await q;
  if (error) throw error;
  const goals = data ?? [];
  const realMap = await getEntriesByGoals(goals.map((g) => g.id));
  return goals.map((g) => {
    const real = realMap[g.id] ?? 0;
    const target = Number(g.target_value);
    const pct = target > 0 ? (real / target) * 100 : 0;
    return { ...g, real_value: real, pct, status: statusFor(pct) };
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
  const goalIds = (goals ?? []).map((g) => g.id);
  const target = (goals ?? []).reduce((s, g) => s + Number(g.target_value), 0);

  let real = 0;
  if (goalIds.length > 0) {
    const { data: entries, error: e2 } = await supabase
      .from("sales_entries")
      .select("amount")
      .in("goal_id", goalIds)
      .gte("sale_date", range.from)
      .lte("sale_date", range.to);
    if (e2) throw e2;
    real = (entries ?? []).reduce((s, r) => s + Number(r.amount), 0);
  }
  const pct = target > 0 ? (real / target) * 100 : 0;
  return { real, target, pct, status: statusFor(pct), range };
}

/** Meta vs Real series by month within current period range (or last 6 months for weekly). */
export async function getGoalVsRealSeries(periodType: GoalPeriod) {
  const now = new Date();
  const months: string[] = [];
  const monthsBack = periodType === "weekly" ? 3 : periodType === "monthly" ? 6 : 6;
  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(d.toISOString().slice(0, 7));
  }
  const from = months[0] + "-01";
  const toDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);

  const { data: goals } = await supabase
    .from("sales_goals")
    .select("id, target_value, start_date, end_date, period_type")
    .eq("period_type", periodType);

  const { data: entries } = await supabase
    .from("sales_entries")
    .select("amount, sale_date, goal_id")
    .gte("sale_date", from)
    .lte("sale_date", toDate);

  const goalById = new Map((goals ?? []).map((g) => [g.id, g]));
  const byMonth = new Map<string, { meta: number; real: number }>();
  for (const m of months) byMonth.set(m, { meta: 0, real: 0 });

  // distribute each goal's target evenly across months it spans (within window)
  for (const g of goals ?? []) {
    const gs = new Date(g.start_date);
    const ge = new Date(g.end_date);
    const spanned: string[] = [];
    for (const m of months) {
      const mStart = new Date(m + "-01");
      const mEnd = new Date(mStart.getFullYear(), mStart.getMonth() + 1, 0);
      if (mEnd >= gs && mStart <= ge) spanned.push(m);
    }
    if (spanned.length === 0) continue;
    const per = Number(g.target_value) / spanned.length;
    for (const m of spanned) byMonth.get(m)!.meta += per;
  }

  for (const e of entries ?? []) {
    if (!goalById.has(e.goal_id)) continue;
    const m = e.sale_date.slice(0, 7);
    if (!byMonth.has(m)) continue;
    byMonth.get(m)!.real += Number(e.amount);
  }

  return months.map((m) => ({ date: m + "-01", ...byMonth.get(m)! }));
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
  const { data, error } = await supabase.from("sales_goals").update(patch).eq("id", id).select().single();
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
}) {
  const { data, error } = await supabase.from("sales_entries").insert(input).select().single();
  if (error) throw error;
  return data;
}