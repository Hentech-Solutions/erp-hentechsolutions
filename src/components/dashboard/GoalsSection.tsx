import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Target } from "lucide-react";
import { KPICard } from "./KPICard";
import { GoalVsRealChart } from "./GoalVsRealChart";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatBRL, formatPercentPlain } from "@/lib/formatters";
import { getGoalsOverview, getGoalVsRealSeries } from "@/lib/data/goals";
import type { Period } from "@/lib/periods";

function statusBadge(s: "success" | "warning" | "danger") {
  if (s === "success")
    return { cls: "bg-success/15 text-success border-success/30", label: "No alvo" };
  if (s === "warning")
    return { cls: "bg-warning/15 text-warning border-warning/30", label: "Atenção" };
  return { cls: "bg-destructive/15 text-destructive border-destructive/30", label: "Crítico" };
}

/** Metas do período selecionado no topo — sem seletor próprio. */
export function GoalsSection({ period }: { period: Period }) {
  const overview = useQuery({
    queryKey: ["goals", "overview", period.from, period.to],
    queryFn: () => getGoalsOverview(period.from, period.to),
  });
  const series = useQuery({
    queryKey: ["goals", "vsreal", period.from, period.to],
    queryFn: () => getGoalVsRealSeries("monthly"),
  });

  const m = overview.data;
  const badge = statusBadge(m?.status ?? "danger");
  const loading = overview.isPending;
  const ahead = (m?.paceDiff ?? 0) >= 0;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Metas</h2>
          <p className="text-sm text-muted-foreground">
            {m?.goalCount
              ? `${m.goalCount} meta(s) ativa(s) no período`
              : "Progresso das metas do período"}
          </p>
        </div>
        <Link
          to="/metas"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground transition hover:text-foreground"
        >
          Gerenciar metas <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {!loading && (m?.goalCount ?? 0) === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/40 p-8 text-center">
          <Target className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Nenhuma meta cobrindo este período.</p>
          <Link
            to="/metas"
            className="mt-3 inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            Criar uma meta de faturamento <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KPICard
              label="Realizado"
              value={formatBRL(m?.real ?? 0)}
              hint={`meta ${formatBRL(m?.target ?? 0)}`}
              loading={loading}
              emphasis="primary"
              to="/metas"
            />
            <KPICard
              label="% atingido"
              value={formatPercentPlain(m?.pct ?? 0)}
              hint={`${formatPercentPlain(m?.elapsedPct ?? 0)} do período`}
              loading={loading}
            />
            <KPICard
              label="Ritmo"
              value={ahead ? "Adiantado" : "Atrasado"}
              hint={`${ahead ? "+" : ""}${formatBRL(m?.paceDiff ?? 0)} vs esperado`}
              loading={loading}
              emphasis={ahead ? "default" : "danger"}
              tooltip="Compara o realizado com o que já deveria estar feito, no ritmo linear do período."
            />
            <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-2">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Status
              </div>
              {loading ? (
                <div className="h-7 w-24 rounded bg-muted animate-pulse" />
              ) : (
                <>
                  <div>
                    <Badge variant="outline" className={cn("text-sm py-1.5 px-3", badge.cls)}>
                      {badge.label}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Faltam {formatBRL(Math.max((m?.target ?? 0) - (m?.real ?? 0), 0))}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <div className="xl:col-span-2">
              <GoalVsRealChart data={series.data ?? []} />
            </div>
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="mb-4">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Por categoria
                </div>
                <div className="text-sm font-medium">Progresso</div>
              </div>
              {(m?.categories ?? []).length === 0 ? (
                <p className="py-6 text-center text-xs text-muted-foreground">
                  Sem categorias no período.
                </p>
              ) : (
                <ul className="space-y-3">
                  {(m?.categories ?? []).map((c) => (
                    <li key={c.category} className="space-y-1">
                      <div className="flex items-baseline justify-between gap-3 text-xs">
                        <span className="truncate">{c.category}</span>
                        <span className="tabular-nums shrink-0">
                          <span className="font-medium">{formatPercentPlain(c.pct)}</span>
                          <span className="ml-2 text-muted-foreground">{formatBRL(c.real)}</span>
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full",
                            c.pct >= 100
                              ? "bg-success"
                              : c.pct >= 70
                                ? "bg-warning"
                                : "bg-destructive",
                          )}
                          style={{ width: `${Math.min(Math.max(c.pct, 2), 100)}%` }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
