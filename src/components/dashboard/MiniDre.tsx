import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import type { DashboardSummary } from "@/lib/data/dashboard";
import { formatBRL, formatPercentPlain } from "@/lib/formatters";
import { cn } from "@/lib/utils";

/**
 * Resultado do período em cascata, com CMV.
 * O dashboard mostrava "Lucro líquido" sem custo de produto — o número era
 * receita menos despesa, e chamava isso de lucro.
 */
export function MiniDre({ data, loading }: { data?: DashboardSummary; loading?: boolean }) {
  if (loading || !data) {
    return (
      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-5 rounded bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  const rows = [
    { label: "Receita", value: data.revenue, tone: "normal" as const },
    { label: "− CMV", value: data.cogs, tone: "negative" as const },
    { label: "= Lucro bruto", value: data.grossProfit, tone: "subtotal" as const },
    { label: "− Despesas", value: data.expense, tone: "negative" as const },
    { label: "= Resultado", value: data.netResult, tone: "total" as const },
  ];

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Resultado do período
          </div>
          <div className="text-sm font-medium">
            Margem bruta {formatPercentPlain(data.grossMargin)}
          </div>
        </div>
        <Link
          to="/financeiro"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground transition hover:text-foreground"
        >
          DRE completo <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="space-y-1 text-sm">
        {rows.map((r) => (
          <div
            key={r.label}
            className={cn(
              "flex items-baseline justify-between gap-4 py-1",
              r.tone === "subtotal" && "border-t border-border pt-2 font-medium",
              r.tone === "total" && "border-t-2 border-border pt-2 font-semibold",
            )}
          >
            <span className={cn(r.tone === "total" ? "text-foreground" : "text-muted-foreground")}>
              {r.label}
            </span>
            <span
              className={cn(
                "tabular-nums shrink-0",
                r.tone === "negative" && "text-destructive",
                r.tone === "total" && (r.value >= 0 ? "text-success" : "text-destructive"),
              )}
            >
              {formatBRL(r.value)}
            </span>
          </div>
        ))}
      </div>

      {data.cogs === 0 && data.revenue > 0 && (
        <p className="mt-3 text-[11px] text-muted-foreground">
          CMV zerado: os planos vendidos ainda não têm custo cadastrado, então a margem bruta está
          superestimada.
        </p>
      )}
    </div>
  );
}
