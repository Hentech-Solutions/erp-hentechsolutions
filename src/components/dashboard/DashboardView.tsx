import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { KPICard } from "@/components/dashboard/KPICard";
import { PeriodPicker } from "@/components/dashboard/PeriodPicker";
import { ActionBar } from "@/components/dashboard/ActionBar";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { CashFlowChart } from "@/components/dashboard/CashFlowChart";
import { ExpenseDonut } from "@/components/dashboard/ExpenseDonut";
import { AlertsPanel } from "@/components/dashboard/AlertsPanel";
import { GoalsSection } from "@/components/dashboard/GoalsSection";
import { OrdersFunnel } from "@/components/dashboard/OrdersFunnel";
import { MiniDre } from "@/components/dashboard/MiniDre";
import { ConcentrationCard, PlanPerformanceCard } from "@/components/dashboard/BusinessHealth";
import { last12Months, type Period } from "@/lib/periods";
import {
  getSummary,
  getRevenueSeries,
  getCashFlowSeries,
  getExpenseBreakdown,
  getAlerts,
  getActionItems,
  getOrdersFunnel,
  getRevenueConcentration,
  getPlanPerformance,
  delta,
} from "@/lib/data/dashboard";
import { formatBRL, formatDate } from "@/lib/formatters";

export function DashboardView() {
  // Um período só governa a tela inteira. Antes havia três controles de tempo
  // independentes e o bloco de pedidos ignorava todos.
  const [period, setPeriod] = useState<Period>(last12Months());
  const key = [period.from, period.to];

  const actions = useQuery({ queryKey: ["dashboard", "actions"], queryFn: getActionItems });
  const s = useQuery({
    queryKey: ["dashboard", "summary", ...key],
    queryFn: () => getSummary(period),
  });
  const rev = useQuery({
    queryKey: ["dashboard", "rev", ...key],
    queryFn: () => getRevenueSeries(period),
  });
  const cf = useQuery({
    queryKey: ["dashboard", "cf", ...key],
    queryFn: () => getCashFlowSeries(period),
  });
  const exp = useQuery({
    queryKey: ["dashboard", "exp", ...key],
    queryFn: () => getExpenseBreakdown(period),
  });
  const al = useQuery({ queryKey: ["dashboard", "al", ...key], queryFn: () => getAlerts(period) });
  const funnel = useQuery({
    queryKey: ["dashboard", "funnel", ...key],
    queryFn: () => getOrdersFunnel(period),
  });
  const conc = useQuery({
    queryKey: ["dashboard", "conc", ...key],
    queryFn: () => getRevenueConcentration(period),
  });
  const plans = useQuery({
    queryKey: ["dashboard", "plans", ...key],
    queryFn: () => getPlanPerformance(period),
  });

  const d = s.data;
  const loading = s.isPending;
  const prevLabel = d ? `${formatDate(d.prevFrom)} a ${formatDate(d.prevTo)}` : undefined;

  return (
    <AppShell title="Dashboard">
      <div className="space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Visão executiva</h2>
            <p className="text-sm text-muted-foreground">
              Todos os blocos abaixo seguem o período selecionado
            </p>
          </div>
          <PeriodPicker period={period} onChange={setPeriod} />
        </div>

        {/* 1. O que exige decisão agora */}
        <ActionBar items={actions.data ?? []} loading={actions.isPending} />

        {/* 2. Os quatro números que importam */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <KPICard
            label="Caixa"
            value={formatBRL(d?.cash ?? 0)}
            hint={d ? `até ${formatDate(d.cashAsOf)}` : undefined}
            loading={loading}
            emphasis={(d?.cash ?? 0) < 0 ? "danger" : "primary"}
            to="/financeiro"
            tooltip="Acumulado de todas as entradas menos saídas, até hoje. Não projeta o futuro."
          />
          <KPICard
            label="A receber"
            value={formatBRL(d?.receivableTotal ?? 0)}
            hint={
              (d?.receivableOverdue ?? 0) > 0
                ? `${formatBRL(d!.receivableOverdue)} vencido`
                : "nada vencido"
            }
            loading={loading}
            emphasis={(d?.receivableOverdue ?? 0) > 0 ? "danger" : "default"}
            to="/contas"
          />
          <KPICard
            label="A pagar"
            value={formatBRL(d?.payableTotal ?? 0)}
            hint={
              (d?.payableOverdue ?? 0) > 0
                ? `${formatBRL(d!.payableOverdue)} vencido`
                : "nada vencido"
            }
            loading={loading}
            emphasis={(d?.payableOverdue ?? 0) > 0 ? "danger" : "default"}
            to="/contas"
          />
          <KPICard
            label="Resultado do período"
            value={formatBRL(d?.netResult ?? 0)}
            delta={d ? delta(d.netResult, d.prevNetResult) : undefined}
            hint={prevLabel ? `vs ${prevLabel}` : undefined}
            loading={loading}
            to="/financeiro"
            tooltip="Receita menos despesas por competência no período."
          />
        </div>

        {/* 3. Números secundários */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <KPICard
            label="Faturamento"
            value={formatBRL(d?.revenue ?? 0)}
            delta={d ? delta(d.revenue, d.prevRevenue) : undefined}
            hint={prevLabel ? `vs ${prevLabel}` : undefined}
            loading={loading}
            to="/financeiro"
          />
          <KPICard
            label="Vendas"
            value={String(d?.salesCount ?? 0)}
            hint={d ? `ticket ${formatBRL(d.ticket)}` : undefined}
            loading={loading}
            tooltip="Vendas registradas no período. O ticket usa só a receita de vendas."
          />
          <KPICard
            label="Margem bruta"
            value={d ? `${d.grossMargin.toFixed(1)}%` : "—"}
            hint={d ? `CMV ${formatBRL(d.cogs)}` : undefined}
            loading={loading}
            tooltip="Margem real: (receita − CMV) ÷ receita. Ponderada pelo que foi de fato vendido."
          />
          <KPICard
            label="Runway"
            value={d?.runwayMonths != null ? `${d.runwayMonths} meses` : "—"}
            hint={d ? `queima ${formatBRL(d.avgMonthlyExpense)}/mês` : undefined}
            loading={loading}
            emphasis={d?.runwayMonths != null && d.runwayMonths < 3 ? "danger" : "default"}
            tooltip="Meses de caixa no ritmo médio de despesa dos últimos 3 meses fechados."
          />
        </div>

        {/* 4. Dinheiro no tempo */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-2">
            <CashFlowChart data={cf.data ?? []} />
          </div>
          <MiniDre data={d} loading={loading} />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-2">
            <RevenueChart data={rev.data ?? []} />
          </div>
          <ExpenseDonut data={exp.data ?? []} />
        </div>

        {/* 5. Comercial */}
        <OrdersFunnel data={funnel.data} loading={funnel.isPending} />

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <ConcentrationCard data={conc.data ?? []} loading={conc.isPending} />
          <PlanPerformanceCard data={plans.data ?? []} loading={plans.isPending} />
        </div>

        {/* 6. Metas */}
        <GoalsSection period={period} />

        <AlertsPanel alerts={al.data ?? []} />
      </div>
    </AppShell>
  );
}
