import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Trophy } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { CustomerTable } from "@/components/customers/CustomerTable";
import { getTopCustomersByRevenue } from "@/lib/data/customers";
import { formatBRL } from "@/lib/formatters";

export const Route = createFileRoute("/_authenticated/clientes")({
  head: () => ({ meta: [{ title: "Clientes — Gestão Empresarial" }] }),
  component: CustomersPage,
});

function CustomersPage() {
  const { data: top = [] } = useQuery({
    queryKey: ["customers-top"],
    queryFn: () => getTopCustomersByRevenue(5),
  });
  const maxValue = top[0]?.total_spent ?? 0;
  return (
    <AppShell title="Gestão de Clientes">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Clientes</h2>
          <p className="text-sm text-muted-foreground">Cadastro, histórico de compras e métricas por cliente</p>
        </div>
        {top.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Top clientes por receita
              </h3>
            </div>
            <div className="space-y-2.5">
              {top.map((c, i) => (
                <Link
                  key={c.id}
                  to="/clientes/$customerId"
                  params={{ customerId: c.id }}
                  className="block group"
                >
                  <div className="flex items-center justify-between gap-3 text-sm mb-1">
                    <span className="flex items-center gap-2 min-w-0">
                      <span className="text-xs text-muted-foreground tabular-nums w-5">{i + 1}.</span>
                      <span className="font-medium truncate group-hover:text-primary transition-colors">{c.name}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {c.sales_count} {c.sales_count === 1 ? "venda" : "vendas"}
                      </span>
                    </span>
                    <span className="tabular-nums font-semibold">{formatBRL(c.total_spent)}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${maxValue > 0 ? (c.total_spent / maxValue) * 100 : 0}%` }}
                    />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
        <CustomerTable />
      </div>
    </AppShell>
  );
}