import { Link } from "@tanstack/react-router";
import { AlertTriangle, ArrowRight, CheckCircle2, Clock, ShieldAlert } from "lucide-react";
import type { ActionItem } from "@/lib/data/dashboard";
import { formatBRL } from "@/lib/formatters";
import { cn } from "@/lib/utils";

const TONE = {
  critical: {
    box: "border-destructive/40 bg-destructive/5 hover:bg-destructive/10",
    icon: "text-destructive",
    Icon: ShieldAlert,
  },
  warning: {
    box: "border-warning/40 bg-warning/5 hover:bg-warning/10",
    icon: "text-warning",
    Icon: AlertTriangle,
  },
  info: {
    box: "border-border bg-card hover:bg-accent/40",
    icon: "text-muted-foreground",
    Icon: Clock,
  },
} as const;

/**
 * O que exige decisão hoje. Fica no topo do dashboard, antes de qualquer
 * número: o painel respondia "quanto entrou" e nunca "o que eu faço agora".
 */
export function ActionBar({ items, loading }: { items: ActionItem[]; loading?: boolean }) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-[74px] rounded-xl border border-border bg-card animate-pulse" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-success/30 bg-success/5 p-4">
        <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
        <div className="text-sm">
          <span className="font-medium">Nada pendente.</span>{" "}
          <span className="text-muted-foreground">
            Sem contas vencidas, pedidos parados ou entregas sem pagamento.
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
      {items.map((a) => {
        const t = TONE[a.severity] ?? TONE.info;
        return (
          <Link
            key={a.kind}
            to={a.link}
            className={cn("group flex items-start gap-3 rounded-xl border p-4 transition", t.box)}
          >
            <t.Icon className={cn("h-4 w-4 shrink-0 mt-0.5", t.icon)} />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium leading-snug">{a.title}</div>
              <div className="mt-0.5 text-xs text-muted-foreground">{a.detail}</div>
              {a.amount != null && (
                <div className="mt-1 text-sm font-semibold tabular-nums">{formatBRL(a.amount)}</div>
              )}
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
          </Link>
        );
      })}
    </div>
  );
}
