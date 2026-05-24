import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter, SheetDescription } from "@/components/ui/sheet";
import { createProduct, updateProduct, listProductCategories, type Product } from "@/lib/data/products";
import { formatPercentPlain } from "@/lib/formatters";
import { cn } from "@/lib/utils";

export function ProductForm({
  trigger,
  initial,
  onSaved,
}: {
  trigger: React.ReactNode;
  initial?: Product;
  onSaved?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sku, setSku] = useState("");
  const [price, setPrice] = useState<string>("0");
  const [cost, setCost] = useState<string>("0");
  const [categoryId, setCategoryId] = useState<string>("");
  const [status, setStatus] = useState<"active" | "inactive">("active");
  const qc = useQueryClient();

  const { data: cats = [] } = useQuery({ queryKey: ["product-categories"], queryFn: listProductCategories });

  useEffect(() => {
    if (open) {
      setName(initial?.name ?? "");
      setDescription(initial?.description ?? "");
      setSku(initial?.sku ?? "");
      setPrice(String(initial?.price ?? 0));
      setCost(String(initial?.cost ?? 0));
      setCategoryId(initial?.category_id ?? "");
      setStatus((initial?.status as "active" | "inactive") ?? "active");
    }
  }, [open, initial]);

  const p = Number(price) || 0;
  const c = Number(cost) || 0;
  const margin = p === 0 ? 0 : ((p - c) / p) * 100;

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        sku: sku.trim() || null,
        price: p,
        cost: c,
        category_id: categoryId || null,
        status,
      };
      return initial ? updateProduct(initial.id, payload) : createProduct(payload);
    },
    onSuccess: () => {
      toast.success(initial ? "Produto atualizado" : "Produto criado");
      qc.invalidateQueries({ queryKey: ["products"] });
      setOpen(false);
      onSaved?.();
    },
    onError: (e: any) => {
      if (e?.code === "23505") toast.error("SKU já existe");
      else toast.error(e?.message ?? "Erro ao salvar");
    },
  });

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{initial ? "Editar produto" : "Novo produto"}</SheetTitle>
          <SheetDescription>Margem é calculada automaticamente a partir de preço e custo.</SheetDescription>
        </SheetHeader>
        <div className="px-4 py-4 space-y-4">
          <div className="space-y-1.5">
            <Label>Nome *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={200} />
          </div>
          <div className="space-y-1.5">
            <Label>Descrição</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={1000} rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Preço (R$) *</Label>
              <Input type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Custo (R$)</Label>
              <Input type="number" min="0" step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} />
            </div>
          </div>
          <div className="rounded-md bg-muted p-3 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Margem calculada</span>
            <span className={cn("tabular-nums font-semibold", margin < 0 ? "text-destructive" : "text-success")}>
              {formatPercentPlain(margin)}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>SKU</Label>
              <Input value={sku} onChange={(e) => setSku(e.target.value)} maxLength={100} />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as "active" | "inactive")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="inactive">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Categoria</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger><SelectValue placeholder="Sem categoria" /></SelectTrigger>
              <SelectContent>
                {cats.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <SheetFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={() => mutation.mutate()} disabled={!name.trim() || mutation.isPending}>
            {mutation.isPending ? "Salvando…" : initial ? "Salvar" : "Criar"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
