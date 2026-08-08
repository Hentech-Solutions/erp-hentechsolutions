import { supabase } from "@/integrations/supabase/client";
import type { Period } from "@/lib/periods";
import { rpc } from "@/lib/data/rpc";
import { getApArSummary } from "@/lib/data/payables";
import { formatBRL as brl } from "@/lib/formatters";

export type Kpi = { value: number; delta: number };

export type DashboardKpis = {
  revenue: Kpi;
  profit: Kpi;
  cash: Kpi;
  salesCount: Kpi;
  ticket: Kpi;
  avgMargin: Kpi;
  /** Data de corte do caixa: nunca no futuro. */
  cashAsOf: string;
};

type KpiPayload = {
  revenue: number;
  prev_revenue: number;
  expense: number;
  prev_expense: number;
  profit: number;
  prev_profit: number;
  cash: number;
  cash_as_of: string;
  sales_count: number;
  ticket: number;
  avg_margin: number;
};

const delta = (a: number, b: number) =>
  b === 0 ? (a > 0 ? 100 : 0) : ((a - b) / Math.abs(b)) * 100;

/**
 * KPIs consolidados. A agregacao roda no Postgres: somar no browser exigia
 * baixar todas as linhas do periodo, e o PostgREST corta em 1000 sem avisar.
 */
export async function getKpis(p: Period): Promise<DashboardKpis> {
  const d = await rpc<KpiPayload>("get_dashboard_kpis", { _from: p.from, _to: p.to });
  const prevTicket = d.prev_revenue > 0 && d.sales_count > 0 ? d.prev_revenue / d.sales_count : 0;
  return {
    revenue: { value: Number(d.revenue), delta: delta(d.revenue, d.prev_revenue) },
    profit: { value: Number(d.profit), delta: delta(d.profit, d.prev_profit) },
    // Caixa e acumulado desde o inicio ate cash_as_of, entao nao tem "periodo
    // anterior" com que se comparar.
    cash: { value: Number(d.cash), delta: 0 },
    salesCount: { value: Number(d.sales_count), delta: 0 },
    ticket: { value: Number(d.ticket), delta: delta(d.ticket, prevTicket) },
    avgMargin: { value: Number(d.avg_margin), delta: 0 },
    cashAsOf: d.cash_as_of,
  };
}

type MonthlyRow = {
  month: string;
  revenue: number;
  expense: number;
  cash_in: number;
  cash_out: number;
};

async function monthlySeries(p: Period): Promise<MonthlyRow[]> {
  const rows = await rpc<MonthlyRow[]>("get_monthly_series", { _from: p.from, _to: p.to });
  return (rows ?? []).map((r) => ({
    month: r.month,
    revenue: Number(r.revenue),
    expense: Number(r.expense),
    cash_in: Number(r.cash_in),
    cash_out: Number(r.cash_out),
  }));
}

export async function getRevenueSeries(p: Period) {
  const rows = await monthlySeries(p);
  return rows.map((r) => ({ date: r.month, revenue: r.revenue, expense: r.expense }));
}

export async function getCashFlowSeries(p: Period) {
  const rows = await monthlySeries(p);
  let acc = 0;
  return rows.map((r) => {
    acc += r.cash_in - r.cash_out;
    return { date: r.month, in: r.cash_in, out: r.cash_out, balance: acc };
  });
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
      title: "Fluxo de caixa negativo",
      message: `Saldo acumulado do período: ${brl(lastBal)}`,
    });
  }

  // Contas vencidas: a base ja tinha is_settled/payment_date preenchidos e
  // ninguem olhava para eles.
  const aging = await getApArSummary();
  const overduePayable = aging.payable.overdue;
  const overdueReceivable = aging.receivable.overdue;
  if (overduePayable.total > 0) {
    alerts.push({
      severity: "critical",
      title: `${overduePayable.count} conta(s) a pagar vencida(s)`,
      message: `Total em atraso: ${brl(overduePayable.total)}`,
    });
  }
  if (overdueReceivable.total > 0) {
    alerts.push({
      severity: "warning",
      title: `${overdueReceivable.count} recebimento(s) em atraso`,
      message: `Total a receber vencido: ${brl(overdueReceivable.total)}`,
    });
  }
  if (aging.payable.dueSoon.total > 0) {
    alerts.push({
      severity: "info",
      title: `${aging.payable.dueSoon.count} conta(s) vencendo em 30 dias`,
      message: `Total previsto: ${brl(aging.payable.dueSoon.total)}`,
    });
  }

  const { data: products } = await supabase
    .from("products")
    .select("id, name, margin")
    .eq("status", "active")
    .is("deleted_at", null);
  for (const prod of products ?? []) {
    if (Number(prod.margin ?? 0) < 10) {
      alerts.push({
        severity: "warning",
        title: `Margem baixa: ${prod.name}`,
        message: `Margem atual de ${Number(prod.margin).toFixed(1)}%`,
      });
    }
  }

  return alerts.slice(0, 6);
}
