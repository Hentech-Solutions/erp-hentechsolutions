import { supabase } from "@/integrations/supabase/client";
import type { Period } from "@/lib/periods";
import { rpc } from "@/lib/data/rpc";

/* ------------------------------------------------------------------ */
/* Resumo consolidado                                                  */
/* ------------------------------------------------------------------ */

export type DashboardSummary = {
  from: string;
  to: string;
  prevFrom: string;
  prevTo: string;
  revenue: number;
  prevRevenue: number;
  expense: number;
  prevExpense: number;
  netResult: number;
  prevNetResult: number;
  cogs: number;
  grossProfit: number;
  /** Margem bruta real (receita − CMV). Substitui a média aritmética de products.margin. */
  grossMargin: number;
  cash: number;
  /** Data de corte do caixa: nunca no futuro. */
  cashAsOf: string;
  salesCount: number;
  salesRevenue: number;
  /** Receita de vendas ÷ nº de vendas — não mistura mais receita avulsa no numerador. */
  ticket: number;
  receivableTotal: number;
  receivableOverdue: number;
  payableTotal: number;
  payableOverdue: number;
  avgMonthlyExpense: number;
  /** Meses de caixa no ritmo atual de despesa. null quando não há queima. */
  runwayMonths: number | null;
};

const n = (v: unknown) => Number(v ?? 0);

export async function getSummary(p: Period): Promise<DashboardSummary> {
  const d = await rpc<Record<string, unknown>>("get_dashboard_summary", {
    _from: p.from,
    _to: p.to,
  });
  return {
    from: String(d.from),
    to: String(d.to),
    prevFrom: String(d.prev_from),
    prevTo: String(d.prev_to),
    revenue: n(d.revenue),
    prevRevenue: n(d.prev_revenue),
    expense: n(d.expense),
    prevExpense: n(d.prev_expense),
    netResult: n(d.net_result),
    prevNetResult: n(d.prev_net_result),
    cogs: n(d.cogs),
    grossProfit: n(d.gross_profit),
    grossMargin: n(d.gross_margin),
    cash: n(d.cash),
    cashAsOf: String(d.cash_as_of),
    salesCount: n(d.sales_count),
    salesRevenue: n(d.sales_revenue),
    ticket: n(d.ticket),
    receivableTotal: n(d.receivable_total),
    receivableOverdue: n(d.receivable_overdue),
    payableTotal: n(d.payable_total),
    payableOverdue: n(d.payable_overdue),
    avgMonthlyExpense: n(d.avg_monthly_expense),
    runwayMonths: d.runway_months == null ? null : n(d.runway_months),
  };
}

/** Variação percentual entre dois períodos. */
export const delta = (a: number, b: number) =>
  b === 0 ? (a > 0 ? 100 : 0) : ((a - b) / Math.abs(b)) * 100;

/* ------------------------------------------------------------------ */
/* Ações do dia                                                        */
/* ------------------------------------------------------------------ */

export type ActionItem = {
  kind: string;
  severity: "critical" | "warning" | "info";
  title: string;
  detail: string;
  amount: number | null;
  count: number;
  link: string;
};

/** O que exige decisão agora — a primeira coisa da tela. */
export async function getActionItems(): Promise<ActionItem[]> {
  const rows = await rpc<ActionItem[]>("get_action_items", { _stale_days: 5 });
  const order = { critical: 0, warning: 1, info: 2 } as const;
  return (rows ?? [])
    .map((r) => ({
      ...r,
      amount: r.amount == null ? null : Number(r.amount),
      count: Number(r.count),
    }))
    .sort((a, b) => order[a.severity] - order[b.severity]);
}

/* ------------------------------------------------------------------ */
/* Séries                                                              */
/* ------------------------------------------------------------------ */

export async function getRevenueSeries(p: Period) {
  const rows = await rpc<Array<{ month: string; revenue: number; expense: number }>>(
    "get_monthly_series",
    { _from: p.from, _to: p.to },
  );
  return (rows ?? []).map((r) => ({
    date: r.month,
    revenue: Number(r.revenue),
    expense: Number(r.expense),
  }));
}

/**
 * Fluxo de caixa com saldo REAL.
 *
 * A versão anterior zerava o acumulado no início do período, então a linha
 * "Saldo" discordava do KPI Caixa sempre que o filtro não cobria toda a
 * história. Agora a série carrega o saldo de abertura.
 */
export async function getCashFlowSeries(p: Period) {
  const rows = await rpc<
    Array<{ month: string; cash_in: number; cash_out: number; balance: number }>
  >("get_cash_series", { _from: p.from, _to: p.to });
  return (rows ?? []).map((r) => ({
    date: r.month,
    in: Number(r.cash_in),
    out: Number(r.cash_out),
    balance: Number(r.balance),
  }));
}

export async function getExpenseBreakdown(p: Period) {
  const rows = await rpc<
    Array<{ name: string; color: string; amount: number; percentage: number }>
  >("get_expense_breakdown", { _from: p.from, _to: p.to });
  return (rows ?? []).map((r) => ({
    name: r.name,
    color: r.color,
    amount: Number(r.amount),
    percentage: Number(r.percentage),
  }));
}

/* ------------------------------------------------------------------ */
/* Funil de pedidos                                                    */
/* ------------------------------------------------------------------ */

export type OrdersFunnel = {
  stages: Array<{ status: string; count: number; value: number }>;
  total: number;
  done: number;
  cancelled: number;
  totalValue: number;
  doneValue: number;
  deliveredUnpaidValue: number;
  /** Concluídos ÷ (total − cancelados). Cancelado é perda, não pipeline. */
  conversion: number;
  cancelRate: number;
  ticket: number;
  leadTimeDays: number | null;
};

export async function getOrdersFunnel(p: Period): Promise<OrdersFunnel> {
  const d = await rpc<Record<string, unknown>>("get_orders_funnel", {
    _from: p.from,
    _to: p.to,
  });
  return {
    stages: ((d.stages ?? []) as Array<{ status: string; count: number; value: number }>).map(
      (s) => ({
        status: s.status,
        count: Number(s.count),
        value: Number(s.value),
      }),
    ),
    total: n(d.total),
    done: n(d.done),
    cancelled: n(d.cancelled),
    totalValue: n(d.total_value),
    doneValue: n(d.done_value),
    deliveredUnpaidValue: n(d.delivered_unpaid_value),
    conversion: n(d.conversion),
    cancelRate: n(d.cancel_rate),
    ticket: n(d.ticket),
    leadTimeDays: d.lead_time_days == null ? null : n(d.lead_time_days),
  };
}

/* ------------------------------------------------------------------ */
/* Concentração e desempenho por plano                                 */
/* ------------------------------------------------------------------ */

export type ConcentrationRow = { name: string; revenue: number; share: number };

export async function getRevenueConcentration(p: Period): Promise<ConcentrationRow[]> {
  const rows = await rpc<Array<{ customer_name: string; revenue: number; share: number }>>(
    "get_revenue_concentration",
    { _from: p.from, _to: p.to, _limit: 5 },
  );
  return (rows ?? []).map((r) => ({
    name: r.customer_name,
    revenue: Number(r.revenue),
    share: Number(r.share),
  }));
}

export type PlanPerformanceRow = {
  name: string;
  orders: number;
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
};

export async function getPlanPerformance(p: Period): Promise<PlanPerformanceRow[]> {
  const rows = await rpc<
    Array<{
      plan_name: string;
      orders_count: number;
      revenue: number;
      cost: number;
      profit: number;
      margin: number;
    }>
  >("get_plan_performance", { _from: p.from, _to: p.to });
  return (rows ?? []).map((r) => ({
    name: r.plan_name,
    orders: Number(r.orders_count),
    revenue: Number(r.revenue),
    cost: Number(r.cost),
    profit: Number(r.profit),
    margin: Number(r.margin),
  }));
}

/* ------------------------------------------------------------------ */
/* Alertas informativos (complementam as ações)                        */
/* ------------------------------------------------------------------ */

export type Alert = {
  severity: "info" | "warning" | "critical";
  title: string;
  message: string;
};

export async function getAlerts(p: Period): Promise<Alert[]> {
  const alerts: Alert[] = [];

  const cf = await getCashFlowSeries(p);
  const lastBal = cf.at(-1)?.balance ?? 0;
  if (lastBal < 0) {
    alerts.push({
      severity: "critical",
      title: "Saldo de caixa negativo",
      message: "O acumulado até o fim do período está negativo.",
    });
  }

  const { data: plans } = await supabase
    .from("plans")
    .select("name, price, unit_cost")
    .eq("is_active", true)
    .is("deleted_at", null);

  for (const pl of plans ?? []) {
    const price = Number(pl.price ?? 0);
    const margin = price > 0 ? ((price - Number(pl.unit_cost ?? 0)) / price) * 100 : 0;
    if (price > 0 && margin < 20) {
      alerts.push({
        severity: "warning",
        title: `Margem baixa: ${pl.name}`,
        message: `Margem de ${margin.toFixed(1)}% sobre o preço de venda`,
      });
    }
  }

  return alerts.slice(0, 5);
}
