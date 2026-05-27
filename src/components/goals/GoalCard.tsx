import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pencil, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatBRL, formatDate, formatPercentPlain } from "@/lib/formatters";
import { deleteGoal, type GoalWithProgress } from "@/lib/data/goals";
import { GoalForm } from "./GoalForm";
import { SaleEntryForm } from "./SaleEntryForm";

const periodLabel = { weekly: "Semanal", monthly: "Mensal", quarterly: "Trimestral" } as const;

function statusColor(status: "success" | "warning" | "danger") {
  if (status === "success") return { bar: "bg-success", text: "text-success", badge: "bg-success/15 text-success border-success/30" };
  if (status === "warning") return { bar: "bg-warning", text: "text-warning", badge: "bg-warning/15 text-warning border-warning/30" };
  return { bar: "bg-destructive", text: "text-destructive", badge: "bg-destructive/15 text-destructive border-destructive/30" };
}

function statusLabel(s: "success" | "warning" | "danger") {
  return s === "success" ? "No alvo" : s === "warning" ? "Atenção" : "Crítico";
}

export function GoalCard({ goal }: { goal: GoalWithProgress }) {
  const [editOpen, setEditOpen] = useState(false);
  const [entryOpen, setEntryOpen] = useState(false);
  const c = statusColor(goal.status);
  const qc = useQueryClient();

  const del = useMutation({
    mutationFn: () => deleteGoal(goal.id),
    onSuccess: () => {
      toast.success("Meta excluída");
      qc.invalidateQueries({ queryKey: ["goals"] });
      qc.invalidateQueries({ queryKey: ["goals-metrics"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao excluir"),
  });

  return (
    <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-semibold tracking-tight truncate">{goal.title}</h3>
          {goal.product_name ? (
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <Badge variant="secondary" className="text-[10px]">Produto: {goal.product_name}</Badge>
              <span className="text-xs text-muted-foreground">· {periodLabel[goal.period_type as keyof typeof periodLabel]}</span>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground mt-0.5">
              {goal.category} · {periodLabel[goal.period_type as keyof typeof periodLabel]}
            </p>
          )}
          <p className="text-[11px] text-muted-foreground/80 mt-0.5">
            {formatDate(goal.start_date)} → {formatDate(goal.end_date)}
          </p>
        </div>
        <Badge variant="outline" className={cn("shrink-0", c.badge)}>{statusLabel(goal.status)}</Badge>
      </div>

      <div className="space-y-2">
        <div className="flex items-baseline justify-between text-sm tabular-nums">
          <span className="text-muted-foreground">Progresso</span>
          <span className={cn("font-semibold", c.text)}>{formatPercentPlain(goal.pct)}</span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div className={cn("h-full transition-all", c.bar)} style={{ width: `${Math.min(100, goal.pct)}%` }} />
        </div>
        <div className="flex items-baseline justify-between text-xs tabular-nums">
          <span className="text-foreground font-medium">{formatBRL(goal.real_value)}</span>
          <span className="text-muted-foreground">de {formatBRL(Number(goal.target_value))}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-1">
        <Button size="sm" className="flex-1" onClick={() => setEntryOpen(true)}>
          <Plus className="h-3.5 w-3.5" /> Lançar venda
        </Button>
        <Button size="sm" variant="outline" onClick={() => setEditOpen(true)} title="Editar">
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => { if (confirm("Excluir esta meta? Os lançamentos vinculados serão removidos.")) del.mutate(); }}
          title="Excluir"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      <GoalForm initial={goal} open={editOpen} onOpenChange={setEditOpen} />
      <SaleEntryForm goal={goal} open={entryOpen} onOpenChange={setEntryOpen} />
    </div>
  );
}