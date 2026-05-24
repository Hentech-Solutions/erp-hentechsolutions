import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { listEntries, softDeleteEntry, restoreEntry } from "@/lib/data/financial";
import { formatBRL, formatDate } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

type EntryType = Database["public"]["Enums"]["financial_entry_type"];

const typeLabel: Record<EntryType, string> = {
  revenue: "Receita", expense: "Despesa", investment: "Investimento", withdrawal: "Retirada", capital_in: "Aporte",
};
const isIncoming = (t: EntryType) => t === "revenue" || t === "capital_in" || t === "investment";

export function EntryTable({ type, from, to }: { type?: EntryType | "all"; from?: string; to?: string }) {
  const [page, setPage] = useState(1);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["entries", { type, from, to, page }],
    queryFn: () => listEntries({ type, from, to, page, pageSize: 50 }),
  });
  const del = useMutation({
    mutationFn: softDeleteEntry,
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ["entries"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Lançamento removido", {
        action: { label: "Desfazer", onClick: async () => { await restoreEntry(id); qc.invalidateQueries({ queryKey: ["entries"] }); } },
      });
    },
  });

  const total = (data?.data ?? []).reduce((s: number, r: any) => s + Number(r.amount) * (isIncoming(r.type) ? 1 : -1), 0);

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="text-left px-4 py-3">Data</th>
            <th className="text-left px-4 py-3">Tipo</th>
            <th className="text-left px-4 py-3">Categoria</th>
            <th className="text-left px-4 py-3">Descrição</th>
            <th className="text-right px-4 py-3">Valor</th>
            <th className="text-right px-4 py-3"></th>
          </tr>
        </thead>
        <tbody>
          {isLoading && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Carregando…</td></tr>}
          {!isLoading && data?.data.length === 0 && (
            <tr><td colSpan={6} className="p-12 text-center">
              <Receipt className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Nenhum lançamento no período</p>
            </td></tr>
          )}
          {data?.data.map((r: any) => {
            const positive = isIncoming(r.type);
            return (
              <tr key={r.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(r.reference_date)}</td>
                <td className="px-4 py-3"><Badge variant="secondary" className="text-[10px]">{typeLabel[r.type as EntryType]}</Badge></td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-2">
                    {r.financial_categories?.color && (
                      <span className="h-2 w-2 rounded-full" style={{ background: r.financial_categories.color }} />
                    )}
                    {r.financial_categories?.name ?? "—"}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{r.description ?? "—"}</td>
                <td className={cn("px-4 py-3 text-right tabular-nums font-medium", positive ? "text-success" : "text-destructive")}>
                  {positive ? "+" : "−"} {formatBRL(r.amount)}
                </td>
                <td className="px-4 py-3 text-right">
                  <Button size="icon" variant="ghost" onClick={() => del.mutate(r.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
        {data && data.data.length > 0 && (
          <tfoot className="bg-muted/30 border-t border-border">
            <tr>
              <td colSpan={4} className="px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground">Saldo do período</td>
              <td className={cn("px-4 py-3 text-right tabular-nums font-semibold", total >= 0 ? "text-success" : "text-destructive")}>
                {formatBRL(total)}
              </td>
              <td />
            </tr>
          </tfoot>
        )}
      </table>
      {data && data.total > data.pageSize && (
        <div className="flex items-center justify-between text-xs text-muted-foreground px-4 py-3 border-t border-border">
          <span>{data.total} lançamentos · página {page}</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Anterior</Button>
            <Button size="sm" variant="outline" disabled={page * data.pageSize >= data.total} onClick={() => setPage((p) => p + 1)}>Próxima</Button>
          </div>
        </div>
      )}
    </div>
  );
}
