import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Pencil, Trash2, ShoppingCart, TrendingUp, Receipt, Mail, Phone, FileText } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CustomerForm } from "@/components/customers/CustomerForm";
import {
  getCustomer,
  getCustomerMetrics,
  getCustomerSales,
  customerSalesCount,
  softDeleteCustomer,
} from "@/lib/data/customers";
import { maskDocument } from "@/lib/document";
import { formatBRL, formatDate } from "@/lib/formatters";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/clientes/$customerId")({
  head: () => ({ meta: [{ title: "Cliente — Gestão Empresarial" }] }),
  component: CustomerDetailPage,
});

function CustomerDetailPage() {
  const { customerId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: customer, isLoading } = useQuery({
    queryKey: ["customer", customerId],
    queryFn: () => getCustomer(customerId),
  });
  const { data: metrics } = useQuery({
    queryKey: ["customer-metrics", customerId],
    queryFn: () => getCustomerMetrics(customerId),
  });
  const { data: sales = [] } = useQuery({
    queryKey: ["customer-sales", customerId],
    queryFn: () => getCustomerSales(customerId),
  });

  const del = useMutation({
    mutationFn: async () => {
      const count = await customerSalesCount(customerId);
      if (count > 0) throw new Error(`Cliente possui ${count} venda(s) vinculada(s). Exclusão bloqueada.`);
      await softDeleteCustomer(customerId);
    },
    onSuccess: () => {
      toast.success("Cliente removido");
      qc.invalidateQueries({ queryKey: ["customers"] });
      navigate({ to: "/clientes" });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao excluir"),
  });

  return (
    <AppShell title="Detalhes do Cliente">
      <div className="space-y-6">
        <Link to="/clientes" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Voltar para clientes
        </Link>

        {isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}

        {customer && (
          <>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h2 className="text-2xl font-semibold tracking-tight">{customer.name}</h2>
                  <Badge variant="secondary">
                    {customer.person_type === "company" ? "Pessoa Jurídica" : "Pessoa Física"}
                  </Badge>
                </div>
                {customer.document && (
                  <p className="text-sm text-muted-foreground font-mono tabular-nums">
                    {(customer.document_type ?? "cpf").toUpperCase()}: {maskDocument(customer.document, customer.document_type as any)}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <CustomerForm
                  initial={customer}
                  trigger={<Button variant="outline"><Pencil className="h-4 w-4 mr-2" />Editar</Button>}
                />
                <Button
                  variant="outline"
                  className="text-destructive hover:text-destructive"
                  onClick={() => {
                    if (confirm(`Excluir cliente "${customer.name}"?`)) del.mutate();
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" /> Excluir
                </Button>
              </div>
            </div>

            {/* Métricas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <MetricCard
                icon={<TrendingUp className="h-4 w-4" />}
                label="Total comprado"
                value={formatBRL(metrics?.total_spent ?? 0)}
              />
              <MetricCard
                icon={<Receipt className="h-4 w-4" />}
                label="Ticket médio"
                value={formatBRL(metrics?.avg_ticket ?? 0)}
              />
              <MetricCard
                icon={<ShoppingCart className="h-4 w-4" />}
                label="Número de compras"
                value={String(metrics?.sales_count ?? 0)}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Contato */}
              <div className="rounded-xl border border-border bg-card p-5 space-y-3">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Contato</h3>
                <InfoRow icon={<Mail className="h-3.5 w-3.5" />} label="E-mail" value={customer.email} />
                <InfoRow icon={<Phone className="h-3.5 w-3.5" />} label="Telefone" value={customer.phone} />
                <InfoRow
                  icon={<FileText className="h-3.5 w-3.5" />}
                  label="Observações"
                  value={customer.notes}
                  multiline
                />
              </div>

              {/* Histórico */}
              <div className="lg:col-span-2 rounded-xl border border-border bg-card overflow-hidden">
                <div className="px-5 py-4 border-b border-border">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Histórico de vendas</h3>
                </div>
                <table className="w-full text-sm">
                  <thead className="bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="text-left px-4 py-2">Data</th>
                      <th className="text-right px-4 py-2">Total</th>
                      <th className="text-right px-4 py-2">Desconto</th>
                      <th className="text-left px-4 py-2">Observações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sales.length === 0 && (
                      <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">Nenhuma venda registrada</td></tr>
                    )}
                    {sales.map((s) => (
                      <tr key={s.id} className="border-t border-border">
                        <td className="px-4 py-2.5 text-muted-foreground">{formatDate(s.sale_date)}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums font-medium">{formatBRL(s.total_amount)}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">{formatBRL(s.discount)}</td>
                        <td className="px-4 py-2.5 text-muted-foreground text-xs truncate max-w-xs">{s.notes ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}

function MetricCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
        {icon} {label}
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
  multiline,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | null | undefined;
  multiline?: boolean;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
        {icon} {label}
      </div>
      <p className={`text-sm ${multiline ? "whitespace-pre-wrap" : ""} ${value ? "" : "text-muted-foreground"}`}>
        {value || "—"}
      </p>
    </div>
  );
}