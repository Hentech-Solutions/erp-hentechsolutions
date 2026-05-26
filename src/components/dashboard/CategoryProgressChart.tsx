import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatBRL, formatPercentPlain } from "@/lib/formatters";

type Row = { category: string; target: number; real: number; pct: number; status: "success" | "warning" | "danger" };

function color(s: Row["status"]) {
  if (s === "success") return { bar: "bg-success", badge: "bg-success/15 text-success border-success/30", label: "≥ 90%" };
  if (s === "warning") return { bar: "bg-warning", badge: "bg-warning/15 text-warning border-warning/30", label: "70–89%" };
  return { bar: "bg-destructive", badge: "bg-destructive/15 text-destructive border-destructive/30", label: "< 70%" };
}

export function CategoryProgressChart({ data }: { data: Row[] }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-4">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Metas</div>
        <div className="text-sm font-medium text-foreground">Progresso por categoria</div>
      </div>
      {data.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Sem categorias para o período</p>
      ) : (
        <div className="space-y-4">
          {data.map((r) => {
            const c = color(r.status);
            return (
              <div key={r.category} className="space-y-1.5">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium truncate">{r.category}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs tabular-nums text-muted-foreground">{formatBRL(r.real)} / {formatBRL(r.target)}</span>
                    <Badge variant="outline" className={cn("text-[10px]", c.badge)}>{formatPercentPlain(r.pct)}</Badge>
                  </div>
                </div>
                <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                  <div className={cn("h-full transition-all", c.bar)} style={{ width: `${Math.min(100, r.pct)}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}