import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash2, Search, Users, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  listCustomers,
  softDeleteCustomer,
  customerSalesCount,
  getCustomersMetricsMap,
  type Customer,
} from "@/lib/data/customers";
import { maskDocument } from "@/lib/document";
import { formatBRL, formatDate } from "@/lib/formatters";
import { CustomerForm } from "./CustomerForm";
import { toast } from "sonner";

export function CustomerTable() {
  const [search, setSearch] = useState("");
  const [personType, setPersonType] = useState<"all" | "individual" | "company">("all");
  const [page, setPage] = useState(1);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["customers", { search, personType, page }],
    queryFn: () => listCustomers({ search, personType, page, pageSize: 50 }),
  });

  const ids = (data?.data ?? []).map((c) => c.id);
  const { data: metricsMap = {} } = useQuery({
    queryKey: ["customers-metrics", ids],
    queryFn: () => getCustomersMetricsMap(ids),
    enabled: ids.length > 0,
  });

  const del = useMutation({
    mutationFn: async (c: Customer) => {
      const count = await customerSalesCount(c.id);
      if (count > 0) {
        throw new Error(`Cliente possui ${count} venda(s) vinculada(s). Exclusão bloqueada.`);
      }
      await softDeleteCustomer(c.id);
    },
    onSuccess: () => {
      toast.success("Cliente removido");
      qc.invalidateQueries({ queryKey: ["customers"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao excluir"),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou CPF/CNPJ…"
            className="pl-9"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <Select value={personType} onValueChange={(v: any) => { setPersonType(v); setPage(1); }}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            <SelectItem value="individual">Pessoa Física</SelectItem>
            <SelectItem value="company">Pessoa Jurídica</SelectItem>
          </SelectContent>
        </Select>
        <CustomerForm trigger={<Button>Novo cliente</Button>} />
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
<div className="kanban-scroll overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-3">Nome</th>
              <th className="text-left px-4 py-3">Documento</th>
              <th className="text-left px-4 py-3">E-mail</th>
              <th className="text-left px-4 py-3">Telefone</th>
              <th className="text-right px-4 py-3">Total comprado</th>
              <th className="text-left px-4 py-3">Última compra</th>
              <th className="text-right px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Carregando…</td></tr>
            )}
            {!isLoading && data?.data.length === 0 && (
              <tr>
                <td colSpan={7} className="p-12 text-center">
                  <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Nenhum cliente encontrado</p>
                </td>
              </tr>
            )}
            {data?.data.map((c) => {
              const m = metricsMap[c.id];
              return (
                <tr key={c.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium flex items-center gap-2">
                      {c.name}
                      <Badge variant="secondary" className="text-[10px]">
                        {c.person_type === "company" ? "PJ" : "PF"}
                      </Badge>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground font-mono tabular-nums">
                    {c.document ? maskDocument(c.document, c.document_type as any) : "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{c.email ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.phone ?? "—"}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatBRL(m?.total_spent ?? 0)}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {m?.last_purchase ? formatDate(m.last_purchase) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-1">
                      <Link
                        to="/clientes/$customerId"
                        params={{ customerId: c.id }}
                        className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground"
                        title="Detalhes"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                      <CustomerForm
                        initial={c}
                        trigger={
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        }
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => {
                          if (confirm(`Excluir cliente "${c.name}"?`)) del.mutate(c);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
</div>
      </div>

      {data && data.total > data.pageSize && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{data.total} cliente(s)</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Anterior</Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page * data.pageSize >= data.total}
              onClick={() => setPage((p) => p + 1)}
            >
              Próxima
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}