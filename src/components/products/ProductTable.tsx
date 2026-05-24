import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash2, Search, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { listProducts, listProductCategories, softDeleteProduct, getSalesCountByProduct, type Product } from "@/lib/data/products";
import { formatBRL, formatPercentPlain, formatDate } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { ProductForm } from "./ProductForm";
import { StatusToggle } from "./StatusToggle";
import { toast } from "sonner";

export function ProductTable() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "inactive">("all");
  const [categoryId, setCategoryId] = useState<string>("all");
  const [page, setPage] = useState(1);
  const qc = useQueryClient();

  const { data: cats = [] } = useQuery({ queryKey: ["product-categories"], queryFn: listProductCategories });
  const { data, isLoading } = useQuery({
    queryKey: ["products", { search, status, categoryId, page }],
    queryFn: () =>
      listProducts({ search, status, categoryId: categoryId === "all" ? null : categoryId, page, pageSize: 50 }),
  });
  const productIds = (data?.data ?? []).map((p: any) => p.id);
  const { data: salesMap = {} } = useQuery({
    queryKey: ["product-sales-count", productIds],
    queryFn: () => getSalesCountByProduct(productIds),
    enabled: productIds.length > 0,
  });

  const del = useMutation({
    mutationFn: softDeleteProduct,
    onSuccess: () => {
      toast.success("Produto removido");
      qc.invalidateQueries({ queryKey: ["products"] });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar produto…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={status} onValueChange={(v: any) => setStatus(v)}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos status</SelectItem>
            <SelectItem value="active">Ativos</SelectItem>
            <SelectItem value="inactive">Inativos</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoryId} onValueChange={setCategoryId}>
          <SelectTrigger className="w-52"><SelectValue placeholder="Categoria" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas categorias</SelectItem>
            {cats.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <ProductForm trigger={<Button>Novo produto</Button>} />
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-3">Nome</th>
              <th className="text-left px-4 py-3">Categoria</th>
              <th className="text-right px-4 py-3">Preço</th>
              <th className="text-right px-4 py-3">Custo</th>
              <th className="text-right px-4 py-3">Margem</th>
              <th className="text-right px-4 py-3">Vendas</th>
              <th className="text-left px-4 py-3">Criado</th>
              <th className="text-center px-4 py-3">Status</th>
              <th className="text-right px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={9} className="p-8 text-center text-muted-foreground">Carregando…</td></tr>
            )}
            {!isLoading && data?.data.length === 0 && (
              <tr>
                <td colSpan={9} className="p-12 text-center">
                  <Package className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Nenhum produto encontrado</p>
                </td>
              </tr>
            )}
            {data?.data.map((p: any) => (
              <tr key={p.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3">
                  <div className="font-medium">{p.name}</div>
                  {p.sku && <div className="text-xs text-muted-foreground">SKU {p.sku}</div>}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{p.product_categories?.name ?? "—"}</td>
                <td className="px-4 py-3 text-right tabular-nums">{formatBRL(p.price)}</td>
                <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{formatBRL(p.cost)}</td>
                <td className={cn("px-4 py-3 text-right tabular-nums font-medium", Number(p.margin) < 0 ? "text-destructive" : "text-success")}>
                  {formatPercentPlain(p.margin)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                  {salesMap[p.id] ?? 0}
                </td>
                <td className="px-4 py-3 text-muted-foreground text-xs">{formatDate(p.created_at)}</td>
                <td className="px-4 py-3 text-center">
                  <div className="inline-flex items-center gap-2">
                    <StatusToggle id={p.id} status={p.status} />
                    <Badge variant={p.status === "active" ? "default" : "secondary"} className="text-[10px]">
                      {p.status === "active" ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="inline-flex gap-1">
                    <ProductForm
                      initial={p as Product}
                      trigger={<Button size="icon" variant="ghost"><Pencil className="h-4 w-4" /></Button>}
                    />
                    <Button size="icon" variant="ghost" onClick={() => del.mutate(p.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data && data.total > data.pageSize && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{data.total} produtos · página {page}</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Anterior</Button>
            <Button size="sm" variant="outline" disabled={page * data.pageSize >= data.total} onClick={() => setPage((p) => p + 1)}>Próxima</Button>
          </div>
        </div>
      )}
    </div>
  );
}
