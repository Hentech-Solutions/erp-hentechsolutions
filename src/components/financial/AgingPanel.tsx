import type { DirectionSummary } from "@/lib/data/payables";
import { isOverdue } from "@/lib/data/payables";
import { formatBRL } from "@/lib/formatters";
import { cn } from "@/lib/utils";

/** Faixas de aging de um lado (a pagar ou a receber). */
export function AgingPanel({
  title,
  summary,
  tone,
}: {
  title: string;
  summary: DirectionSummary;
  tone: "receivable" | "payable";
}) {
  const max = Math.max(...summary.buckets.map((b) => b.total), 1);
  const accent = tone === "receivable" ? "text-success" : "text-destructive";

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
        <span className={cn("text-lg font-semibold tabular-nums", accent)}>
          {formatBRL(summary.all.total)}
        </span>
      </div>
      <p className="mt-0.5 text-xs text-muted-foreground">
        {summary.all.count} lançamento(s) em aberto
        {summary.overdue.count > 0 && (
          <>
            {" · "}
            <span className="text-destructive font-medium">
              {summary.overdue.count} vencido(s) · {formatBRL(summary.overdue.total)}
            </span>
          </>
        )}
      </p>

      <div className="mt-4 space-y-2">
        {summary.buckets.length === 0 && (
          <p className="py-6 text-center text-xs text-muted-foreground">Nada em aberto por aqui.</p>
        )}
        {summary.buckets.map((b) => (
          <div key={b.bucket} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span
                className={cn(isOverdue(b.bucket) ? "text-destructive" : "text-muted-foreground")}
              >
                {b.label}
                <span className="ml-1.5 text-muted-foreground/60">({b.count})</span>
              </span>
              <span className="tabular-nums font-medium">{formatBRL(b.total)}</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  isOverdue(b.bucket) ? "bg-destructive" : "bg-primary",
                )}
                style={{ width: `${Math.max((b.total / max) * 100, 2)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
