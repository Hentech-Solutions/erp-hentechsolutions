import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { KPICard } from "./KPICard";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatBRL, formatPercentPlain } from "@/lib/formatters";
import {
  getPeriodMetrics,
  getGoalVsRealSeries,
  getProgressByCategory,
  getQuarterlyWeeklyAccum,
  type GoalPeriod,
} from "@/lib/data/goals";
import { GoalVsRealChart } from "./GoalVsRealChart";
import { CategoryProgressChart } from "./CategoryProgressChart";
import { QuarterlyAccumChart } from "./QuarterlyAccumChart";

const tabs: { key: GoalPeriod; label: string }[] = [
  { key: "weekly", label: "Semanal" },
  { key: "monthly", label: "Mensal" },
  { key: "quarterly", label: "Trimestral" },
];

function statusBadge(s: "success" | "warning" | "danger") {
  if (s === "success") return { cls: "bg-success/15 text-success border-success/30", label: "No alvo" };
  if (s === "warning") return { cls: "bg-warning/15 text-warning border-warning/30", label: "Atenção" };
  return { cls: "bg-destructive/15 text-destructive border-destructive/30", label: "Crítico" };
}

export function GoalsSection() {
  const [period, setPeriod] = useState<GoalPeriod>("monthly");
  const metrics = useQuery({ queryKey: ["goals-metrics", period], queryFn: () => getPeriodMetrics(period) });
  const series = useQuery({ queryKey: ["goals", "vsreal", period], queryFn: () => getGoalVsRealSeries(period) });
  const cats = useQuery({ queryKey: ["goals", "cats", period], queryFn: () => getProgressByCategory(period) });
  const quarter = useQuery({ queryKey: ["goals", "quarter"], queryFn: () => getQuarterlyWeeklyAccum() });

  const m = metrics.data;
  const badge = statusBadge(m?.status ?? "danger");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Metas de vendas</h2>
          <p className="text-sm text-muted-foreground">Progresso e projeção por período</p>
        </div>
        <div className="inline-flex items-center rounded-lg border border-border bg-card p-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setPeriod(t.key)}
              className={cn(
                "px-3 py-1.5 text-xs rounded-md transition-colors",
                period === t.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard label="Faturamento real" value={formatBRL(m?.real ?? 0)} emphasis="primary" />
        <KPICard label="Meta do período" value={formatBRL(m?.target ?? 0)} />
        <KPICard label="% atingido" value={formatPercentPlain(m?.pct ?? 0)} />
        <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-2">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Status</div>
          <div>
            <Badge variant="outline" className={cn("text-sm py-1.5 px-3", badge.cls)}>{badge.label}</Badge>
          </div>
          <div className="text-xs text-muted-foreground">
            {m ? `${formatBRL(m.real)} de ${formatBRL(m.target)}` : "—"}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2"><GoalVsRealChart data={series.data ?? []} /></div>
        <CategoryProgressChart data={cats.data ?? []} />
      </div>

      <QuarterlyAccumChart data={quarter.data ?? []} />
    </div>
  );
}