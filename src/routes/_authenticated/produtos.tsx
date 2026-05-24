import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { ProductTable } from "@/components/products/ProductTable";

export const Route = createFileRoute("/_authenticated/produtos")({
  head: () => ({ meta: [{ title: "Produtos — Gestão Empresarial" }] }),
  component: ProductsPage,
});

function ProductsPage() {
  return (
    <AppShell title="Gestão de Produtos">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Catálogo</h2>
          <p className="text-sm text-muted-foreground">Cadastro, métricas e status dos produtos</p>
        </div>
        <ProductTable />
      </div>
    </AppShell>
  );
}
