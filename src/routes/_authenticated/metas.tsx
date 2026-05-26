import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { GoalCard } from "@/components/goals/GoalCard";
import { GoalForm } from "@/components/goals/GoalForm";
import { listGoals, type GoalPeriod } from "@/lib/data/goals";

export const Route = createFileRoute("/_authenticated/metas")({
  head: () => ({ meta: [{ title: "Metas — Gestão Empresarial" }] }),
  component: GoalsPage,
});

const tabs: { key: "all" | GoalPeriod; label: string }[] = [
  { key: "all", label: "Todas" },
  { key: "weekly", label: "Semanal" },
  { key: "monthly", label: "Mensal" },
  { key: "quarterly", label: "Trimestral" },
];

function GoalsPage() {
  const [filter, setFilter] = useState<"all" | GoalPeriod>("all");
  const goals = useQuery({
    queryKey: ["goals", filter],
    queryFn: () => listGoals(filter === "all" ? undefined : filter),
  });

  return (
    <AppShell title="Gestão de Metas">
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Metas</h2>
            <p className="text-sm text-muted-foreground">Defina, acompanhe e lance vendas contra suas metas</p>
          </div>
          <GoalForm trigger={<Button><Plus className="h-4 w-4" /> Nova meta</Button>} />
        </div>

        <div className="inline-flex items-center rounded-lg border border-border bg-card p-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setFilter(t.key)}
              className={cn(
                "px-3 py-1.5 text-xs rounded-md transition-colors",
                filter === t.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {goals.isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando metas…</p>
        ) : (goals.data ?? []).length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card/40 p-10 text-center">
            <p className="text-sm text-muted-foreground">Nenhuma meta cadastrada ainda.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {(goals.data ?? []).map((g) => <GoalCard key={g.id} goal={g} />)}
          </div>
        )}
      </div>
    </AppShell>
  );
}