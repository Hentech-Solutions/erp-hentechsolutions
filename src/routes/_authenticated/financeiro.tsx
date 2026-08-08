import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { PeriodPicker } from "@/components/dashboard/PeriodPicker";
import { KPICard } from "@/components/dashboard/KPICard";
import { EntryForm } from "@/components/financial/EntryForm";
import { EntryTable } from "@/components/financial/EntryTable";
import { DreStatement } from "@/components/financial/DreStatement";
import { last12Months, type Period } from "@/lib/periods";
import { getProfitBreakdown } from "@/lib/data/financial";
import { formatBRL, formatPercentPlain } from "@/lib/formatters";

export const Route = createFileRoute("/_authenticated/financeiro")({
  head: () => ({ meta: [{ title: "Centro Financeiro — Gestão Empresarial" }] }),
  component: FinancePage,
});

function FinancePage() {
  const [period, setPeriod] = useState<Period>(last12Months());
  const profit = useQuery({ queryKey: ["profit", period], queryFn: () => getProfitBreakdown(period.from, period.to) });

  return (
    <AppShell title="Centro Financeiro">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Centro Financeiro</h2>
            <p className="text-sm text-muted-foreground">Receitas, despesas, investimentos e análise de lucro</p>
          </div>
          <div className="flex items-center gap-2">
            <PeriodPicker period={period} onChange={setPeriod} />
            <EntryForm trigger={<Button><Plus className="h-4 w-4 mr-1" />Novo lançamento</Button>} />
          </div>
        </div>

        <Tabs defaultValue="all">
          <TabsList className="kanban-scroll w-full justify-start overflow-x-auto">
            <TabsTrigger value="all">Histórico</TabsTrigger>
            <TabsTrigger value="revenue">Faturamento</TabsTrigger>
            <TabsTrigger value="expense">Despesas</TabsTrigger>
            <TabsTrigger value="cashflow">Fluxo de Caixa</TabsTrigger>
            <TabsTrigger value="investments">Investimentos</TabsTrigger>
            <TabsTrigger value="profit">Lucro</TabsTrigger>
          </TabsList>
          <TabsContent value="all" className="mt-4">
            <EntryTable type="all" from={period.from} to={period.to} />
          </TabsContent>
          <TabsContent value="revenue" className="mt-4">
            <EntryTable type="revenue" from={period.from} to={period.to} />
          </TabsContent>
          <TabsContent value="expense" className="mt-4">
            <EntryTable type="expense" from={period.from} to={period.to} />
          </TabsContent>
          <TabsContent value="cashflow" className="mt-4 space-y-3">
            <p className="text-xs text-muted-foreground">Entradas (receitas, aportes, investimentos) vs saídas (despesas, retiradas).</p>
            <EntryTable type="all" from={period.from} to={period.to} />
          </TabsContent>
          <TabsContent value="investments" className="mt-4">
            <EntryTable type="investment" from={period.from} to={period.to} />
          </TabsContent>
          <TabsContent value="profit" className="mt-4 space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KPICard label="Receita bruta" value={formatBRL(profit.data?.revenue ?? 0)} />
              <KPICard label="CMV" value={formatBRL(profit.data?.cogs ?? 0)} hint="custo dos produtos vendidos" />
              <KPICard label="Lucro operacional" value={formatBRL(profit.data?.operatingProfit ?? 0)} emphasis="primary" />
              <KPICard label="Margem líquida" value={formatPercentPlain(profit.data?.netMargin ?? 0)} />
            </div>
            <DreStatement dre={profit.data} />
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
