import { createFileRoute } from "@tanstack/react-router";
import { Fragment, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ScrollText, ShieldAlert } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AUDITED_TABLES, diffFields, listAuditLog, type AuditRow } from "@/lib/data/audit";
import { useUserRole } from "@/hooks/use-user-role";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/auditoria")({
  head: () => ({ meta: [{ title: "Auditoria — Hentech ERP" }] }),
  component: AuditPage,
});

const OP_STYLE: Record<AuditRow["operation"], string> = {
  INSERT: "bg-success/15 text-success border-success/30",
  UPDATE: "bg-primary/15 text-primary border-primary/30",
  DELETE: "bg-destructive/15 text-destructive border-destructive/30",
};

const OP_LABEL: Record<AuditRow["operation"], string> = {
  INSERT: "Criou",
  UPDATE: "Alterou",
  DELETE: "Excluiu",
};

const fmt = (v: unknown) => {
  if (v === null || v === undefined) return "—";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
};

function AuditPage() {
  const { isAdmin, loading } = useUserRole();
  const [table, setTable] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["audit", table, page],
    queryFn: () => listAuditLog({ table, page, pageSize: 100 }),
    enabled: isAdmin,
  });

  if (!loading && !isAdmin) {
    return (
      <AppShell title="Auditoria">
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <ShieldAlert className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            Somente administradores acessam a auditoria.
          </p>
        </div>
      </AppShell>
    );
  }

  const rows = data?.data ?? [];

  return (
    <AppShell title="Auditoria">
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Trilha de auditoria</h2>
            <p className="text-sm text-muted-foreground">
              Quem criou, alterou ou excluiu cada registro
            </p>
          </div>
          <Select
            value={table}
            onValueChange={(v) => {
              setTable(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[220px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as tabelas</SelectItem>
              {AUDITED_TABLES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="kanban-scroll overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-3">Quando</th>
                  <th className="text-left px-4 py-3">Quem</th>
                  <th className="text-left px-4 py-3">Ação</th>
                  <th className="text-left px-4 py-3">Tabela</th>
                  <th className="text-left px-4 py-3">Mudanças</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground">
                      Carregando…
                    </td>
                  </tr>
                )}
                {!isLoading && rows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-12 text-center">
                      <ScrollText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">
                        Nenhum registro ainda. A trilha começa a partir da ativação dos triggers.
                      </p>
                    </td>
                  </tr>
                )}
                {rows.map((r) => {
                  const changes = diffFields(r);
                  const open = expanded === r.id;
                  return (
                    <Fragment key={r.id}>
                      <tr
                        className="border-t border-border hover:bg-muted/30 transition-colors cursor-pointer"
                        onClick={() => setExpanded(open ? null : r.id)}
                      >
                        <td className="px-4 py-3 text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                          {new Date(r.changed_at).toLocaleString("pt-BR")}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {r.user_email ?? <span className="text-muted-foreground">sistema</span>}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant="outline"
                            className={cn("text-[10px]", OP_STYLE[r.operation])}
                          >
                            {OP_LABEL[r.operation]}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-xs font-mono text-muted-foreground">
                          {r.table_name}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {r.operation === "UPDATE"
                            ? `${changes.length} campo(s)`
                            : r.operation === "INSERT"
                              ? "registro criado"
                              : "registro excluído"}
                        </td>
                      </tr>
                      {open && changes.length > 0 && (
                        <tr className="border-t border-border bg-muted/20">
                          <td colSpan={5} className="px-4 py-3">
                            <div className="space-y-1.5">
                              {changes.map((c) => (
                                <div
                                  key={c.field}
                                  className="grid grid-cols-[160px_1fr_1fr] gap-3 text-xs items-baseline"
                                >
                                  <span className="font-mono text-muted-foreground truncate">
                                    {c.field}
                                  </span>
                                  <span className="text-destructive/80 line-through truncate">
                                    {fmt(c.from)}
                                  </span>
                                  <span className="text-success truncate">{fmt(c.to)}</span>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
          {data && data.total > data.pageSize && (
            <div className="flex items-center justify-between text-xs text-muted-foreground px-4 py-3 border-t border-border">
              <span>
                {data.total} evento(s) · página {page}
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
    </AppShell>
  );
}
