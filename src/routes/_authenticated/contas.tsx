import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CalendarClock, CheckCheck, Undo2 } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { AgingPanel } from "@/components/financial/AgingPanel";
import { KPICard } from "@/components/dashboard/KPICard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getApArSummary,
  listOpenEntries,
  settleEntries,
  unsettleEntries,
  type Direction,
  type OpenEntry,
} from "@/lib/data/payables";
import { formatBRL, formatDate } from "@/lib/formatters";
import { useUserRole } from "@/hooks/use-user-role";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/contas")({
  head: () => ({ meta: [{ title: "Contas a Pagar e Receber — Hentech ERP" }] }),
  component: ContasPage,
});

const today = () => new Date().toISOString().slice(0, 10);

function ContasPage() {
  const [direction, setDirection] = useState<Direction>("payable");

  const summary = useQuery({ queryKey: ["apar", "summary"], queryFn: () => getApArSummary() });
  const s = summary.data;

  return (
    <AppShell title="Contas a Pagar e Receber">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Contas</h2>
          <p className="text-sm text-muted-foreground">
            O que ainda vai entrar e o que ainda vai sair, por faixa de vencimento
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            label="A receber"
            value={formatBRL(s?.receivable.all.total ?? 0)}
            hint={`${s?.receivable.all.count ?? 0} em aberto`}
            emphasis="primary"
          />
          <KPICard
            label="Recebimentos vencidos"
            value={formatBRL(s?.receivable.overdue.total ?? 0)}
            hint={`${s?.receivable.overdue.count ?? 0} atrasado(s)`}
          />
          <KPICard
            label="A pagar"
            value={formatBRL(s?.payable.all.total ?? 0)}
            hint={`${s?.payable.all.count ?? 0} em aberto`}
          />
          <KPICard
            label="Saldo projetado"
            value={formatBRL((s?.receivable.all.total ?? 0) - (s?.payable.all.total ?? 0))}
            hint="a receber − a pagar"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <AgingPanel title="A receber" summary={s?.receivable ?? emptySummary} tone="receivable" />
          <AgingPanel title="A pagar" summary={s?.payable ?? emptySummary} tone="payable" />
        </div>

        <Tabs value={direction} onValueChange={(v) => setDirection(v as Direction)}>
          <TabsList>
            <TabsTrigger value="payable">A pagar</TabsTrigger>
            <TabsTrigger value="receivable">A receber</TabsTrigger>
          </TabsList>
          <TabsContent value="payable" className="mt-4">
            <EntriesTable direction="payable" />
          </TabsContent>
          <TabsContent value="receivable" className="mt-4">
            <EntriesTable direction="receivable" />
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}

const emptySummary = {
  buckets: [],
  overdue: { count: 0, total: 0 },
  dueSoon: { count: 0, total: 0 },
  all: { count: 0, total: 0 },
};

function EntriesTable({ direction }: { direction: Direction }) {
  const [status, setStatus] = useState<"open" | "overdue" | "settled">("open");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const qc = useQueryClient();
  const { isStaff } = useUserRole();

  const { data, isLoading } = useQuery({
    queryKey: ["apar", "list", direction, status, page],
    queryFn: () => listOpenEntries({ direction, status, page, pageSize: 50 }),
  });

  const refresh = () => {
    setSelected(new Set());
    qc.invalidateQueries({ queryKey: ["apar"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
    qc.invalidateQueries({ queryKey: ["entries"] });
  };

  const settle = useMutation({
    mutationFn: (ids: string[]) => settleEntries(ids, today()),
    onSuccess: (n) => {
      toast.success(`${n} lançamento(s) liquidado(s)`);
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const unsettle = useMutation({
    mutationFn: (ids: string[]) => unsettleEntries(ids),
    onSuccess: (n) => {
      toast.success(`${n} liquidação(ões) estornada(s)`);
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = data?.data ?? [];
  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.id)));

  const selectedTotal = rows
    .filter((r) => selected.has(r.id))
    .reduce((sum, r) => sum + Number(r.amount), 0);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={status}
          onValueChange={(v) => {
            setStatus(v as typeof status);
            setPage(1);
            setSelected(new Set());
          }}
        >
          <SelectTrigger className="w-[190px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="open">Em aberto</SelectItem>
            <SelectItem value="overdue">Somente vencidos</SelectItem>
            <SelectItem value="settled">Liquidados</SelectItem>
          </SelectContent>
        </Select>

        {selected.size > 0 && isStaff && (
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs text-muted-foreground tabular-nums">
              {selected.size} selecionado(s) · {formatBRL(selectedTotal)}
            </span>
            {status === "settled" ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => unsettle.mutate([...selected])}
                disabled={unsettle.isPending}
              >
                <Undo2 className="h-4 w-4 mr-1" /> Estornar
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => settle.mutate([...selected])}
                disabled={settle.isPending}
              >
                <CheckCheck className="h-4 w-4 mr-1" /> Dar baixa
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="kanban-scroll overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="w-10 px-4 py-3">
                  {isStaff && (
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={toggleAll}
                      aria-label="Selecionar todos"
                    />
                  )}
                </th>
                <th className="text-left px-4 py-3">Vencimento</th>
                <th className="text-left px-4 py-3">Categoria</th>
                <th className="text-left px-4 py-3">Descrição</th>
                <th className="text-left px-4 py-3">Situação</th>
                <th className="text-right px-4 py-3">Valor</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    Carregando…
                  </td>
                </tr>
              )}
              {!isLoading && rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-12 text-center">
                    <CalendarClock className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">Nada por aqui.</p>
                  </td>
                </tr>
              )}
              {rows.map((r) => (
                <Row
                  key={r.id}
                  row={r}
                  checked={selected.has(r.id)}
                  onToggle={() => toggle(r.id)}
                  selectable={isStaff}
                />
              ))}
            </tbody>
          </table>
        </div>
        {data && data.total > data.pageSize && (
          <div className="flex items-center justify-between text-xs text-muted-foreground px-4 py-3 border-t border-border">
            <span>
              {data.total} lançamento(s) · página {page}
            </span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Anterior
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={page * data.pageSize >= data.total}
                onClick={() => setPage((p) => p + 1)}
              >
                Próxima
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({
  row,
  checked,
  onToggle,
  selectable,
}: {
  row: OpenEntry;
  checked: boolean;
  onToggle: () => void;
  selectable: boolean;
}) {
  const overdue = !row.is_settled && row.due_date < today();
  const daysLate = overdue
    ? Math.round((Date.parse(today()) - Date.parse(row.due_date)) / 86_400_000)
    : 0;

  return (
    <tr
      className={cn(
        "border-t border-border hover:bg-muted/30 transition-colors",
        checked && "bg-muted/40",
      )}
    >
      <td className="px-4 py-3">
        {selectable && (
          <Checkbox checked={checked} onCheckedChange={onToggle} aria-label="Selecionar" />
        )}
      </td>
      <td
        className={cn(
          "px-4 py-3 text-xs tabular-nums",
          overdue ? "text-destructive font-medium" : "text-muted-foreground",
        )}
      >
        {formatDate(row.due_date)}
      </td>
      <td className="px-4 py-3">
        <span className="inline-flex items-center gap-2">
          {row.financial_categories?.color && (
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: row.financial_categories.color }}
            />
          )}
          {row.financial_categories?.name ?? "—"}
        </span>
      </td>
      <td className="px-4 py-3 text-muted-foreground">
        {row.description ?? "—"}
        {row.customers?.name && (
          <span className="ml-2 text-xs text-muted-foreground/70">· {row.customers.name}</span>
        )}
        {row.recurrence_group_id && (
          <Badge variant="outline" className="ml-2 text-[10px]">
            recorrente
          </Badge>
        )}
      </td>
      <td className="px-4 py-3">
        {row.is_settled ? (
          <Badge variant="secondary" className="text-[10px]">
            Liquidado
          </Badge>
        ) : overdue ? (
          <Badge variant="destructive" className="text-[10px]">
            {daysLate}d em atraso
          </Badge>
        ) : (
          <Badge variant="outline" className="text-[10px]">
            Em aberto
          </Badge>
        )}
      </td>
      <td className="px-4 py-3 text-right tabular-nums font-medium">{formatBRL(row.amount)}</td>
    </tr>
  );
}
