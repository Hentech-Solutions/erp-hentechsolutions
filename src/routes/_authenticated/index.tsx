import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { KPICard } from "@/components/dashboard/KPICard";
import { PeriodPicker } from "@/components/dashboard/PeriodPicker";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { CashFlowChart } from "@/components/dashboard/CashFlowChart";
import { ExpenseDonut } from "@/components/dashboard/ExpenseDonut";
import { AlertsPanel } from "@/components/dashboard/AlertsPanel";
import { last12Months, type Period } from "@/lib/periods";
import { getKpis, getRevenueSeries, getCashFlowSeries, getExpenseBreakdown, getAlerts } from "@/lib/data/dashboard";
import { formatBRL, formatPercentPlain } from "@/lib/formatters";

export const Route = createFileRoute("/_authenticated/")({ component: Dashboard });

function Dashboard() {
  const [period, setPeriod] = useState<Period>(last12Months());
  const k = useQuery({ queryKey: ["dashboard", "kpis", period], queryFn: () => getKpis(period) });
  const rev = useQuery({ queryKey: ["dashboard", "rev", period], queryFn: () => getRevenueSeries(period) });
  const cf = useQuery({ queryKey: ["dashboard", "cf", period], queryFn: () => getCashFlowSeries(period) });
  const exp = useQuery({ queryKey: ["dashboard", "exp", period], queryFn: () => getExpenseBreakdown(period) });
  const al = useQuery({ queryKey: ["dashboard", "al", period], queryFn: () => getAlerts(period) });

  return (
    <AppShell title="Dashboard">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Visão executiva</h2>
            <p className="text-sm text-muted-foreground">Indicadores consolidados do período</p>
          </div>
          <PeriodPicker period={period} onChange={setPeriod} />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          <KPICard label="Faturamento" value={formatBRL(k.data?.revenue.value ?? 0)} delta={k.data?.revenue.delta} hint="vs anterior" emphasis="primary" />
          <KPICard label="Lucro líquido" value={formatBRL(k.data?.profit.value ?? 0)} delta={k.data?.profit.delta} hint="vs anterior" />
          <KPICard label="Caixa" value={formatBRL(k.data?.cash.value ?? 0)} delta={k.data?.cash.delta} hint="vs anterior" />
          <KPICard label="Vendas" value={String(k.data?.salesCount.value ?? 0)} delta={k.data?.salesCount.delta} />
          <KPICard label="Ticket médio" value={formatBRL(k.data?.ticket.value ?? 0)} delta={k.data?.ticket.delta} />
          <KPICard label="Margem média" value={formatPercentPlain(k.data?.avgMargin.value ?? 0)} hint="produtos ativos" />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-2"><RevenueChart data={rev.data ?? []} /></div>
          <ExpenseDonut data={exp.data ?? []} />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-2"><CashFlowChart data={cf.data ?? []} /></div>
          <AlertsPanel alerts={al.data ?? []} />
        </div>
      </div>
    </AppShell>
  );
}
