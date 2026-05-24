import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatPercent } from "@/lib/formatters";

export function KPICard({
  label,
  value,
  delta,
  hint,
  emphasis = "default",
}: {
  label: string;
  value: string;
  delta?: number;
  hint?: string;
  emphasis?: "default" | "primary";
}) {
  const positive = (delta ?? 0) >= 0;
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-5 flex flex-col gap-2",
        emphasis === "primary" && "ring-1 ring-primary/30",
      )}
    >
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-2xl font-semibold tabular-nums">{value}</div>
      {delta !== undefined && (
        <div
          className={cn(
            "text-xs flex items-center gap-1 tabular-nums",
            positive ? "text-success" : "text-destructive",
          )}
        >
          {positive ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
          {formatPercent(delta)}
          {hint && <span className="text-muted-foreground ml-1">{hint}</span>}
        </div>
      )}
      {delta === undefined && hint && <div className="text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}
