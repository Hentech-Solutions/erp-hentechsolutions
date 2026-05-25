import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { CustomerTable } from "@/components/customers/CustomerTable";

export const Route = createFileRoute("/_authenticated/clientes")({
  head: () => ({ meta: [{ title: "Clientes — Gestão Empresarial" }] }),
  component: CustomersPage,
});

function CustomersPage() {
  return (
    <AppShell title="Gestão de Clientes">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Clientes</h2>
          <p className="text-sm text-muted-foreground">Cadastro, histórico de compras e métricas por cliente</p>
        </div>
        <CustomerTable />
      </div>
    </AppShell>
  );
}