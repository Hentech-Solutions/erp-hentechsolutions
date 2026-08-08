import { Link } from "@tanstack/react-router";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatPercent } from "@/lib/formatters";

export type KPICardProps = {
  label: string;
  value: string;
  delta?: number;
  hint?: string;
  emphasis?: "default" | "primary" | "danger";
  /** Enquanto true mostra esqueleto — nunca R$ 0,00 fingindo ser dado real. */
  loading?: boolean;
  /** Rota para onde o card leva ao ser clicado. */
  to?: string;
  search?: Record<string, unknown>;
  /** Texto do title, útil para explicar de onde sai o número. */
  tooltip?: string;
};

function Body({ label, value, delta, hint, loading, tooltip }: KPICardProps) {
  if (loading) {
    return (
      <>
        <div className="h-2.5 w-20 rounded bg-muted animate-pulse" />
        <div className="h-7 w-28 rounded bg-muted animate-pulse" />
        <div className="h-3 w-16 rounded bg-muted/60 animate-pulse" />
      </>
    );
  }
  const positive = (delta ?? 0) >= 0;
  return (
    <>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground" title={tooltip}>
        {label}
      </div>
      <div className="text-2xl font-semibold tabular-nums">{value}</div>
      {delta !== undefined ? (
        <div
          className={cn(
            "text-xs flex items-center gap-1 tabular-nums",
            positive ? "text-success" : "text-destructive",
          )}
        >
          {positive ? (
            <ArrowUpRight className="h-3.5 w-3.5" />
          ) : (
            <ArrowDownRight className="h-3.5 w-3.5" />
          )}
          {formatPercent(delta)}
          {hint && <span className="text-muted-foreground ml-1">{hint}</span>}
        </div>
      ) : (
        hint && <div className="text-xs text-muted-foreground">{hint}</div>
      )}
    </>
  );
}

export function KPICard(props: KPICardProps) {
  const { emphasis = "default", to, search, tooltip } = props;

  const shell = cn(
    "rounded-xl border bg-card p-5 flex flex-col gap-2 text-left",
    emphasis === "primary" && "border-border ring-1 ring-primary/30",
    emphasis === "danger" && "border-destructive/40 ring-1 ring-destructive/20",
    emphasis === "default" && "border-border",
    to && "transition hover:border-primary/40 hover:bg-accent/30 cursor-pointer",
  );

  if (to && !props.loading) {
    return (
      <Link to={to} search={search as never} className={shell} title={tooltip}>
        <Body {...props} />
      </Link>
    );
  }

  return (
    <div className={shell} title={tooltip}>
      <Body {...props} />
    </div>
  );
}
