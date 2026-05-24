import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormModal, FieldGroupLabel } from "@/components/ui/form-modal";
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
    <FormModal
      open={open}
      onOpenChange={setOpen}
      trigger={trigger}
      title={initial ? "Editar produto" : "Novo produto"}
        description="Cadastre os detalhes técnicos e financeiros do item."
        size="3xl"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={() => mutation.mutate()} disabled={!name.trim() || mutation.isPending} className="px-6">
              {mutation.isPending ? "Salvando…" : initial ? "Salvar alterações" : "Criar produto"}
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-12 gap-8">
          {/* Left: Identificação */}
          <div className="col-span-12 lg:col-span-7 space-y-6">
            <div className="space-y-4">
              <FieldGroupLabel>Identificação</FieldGroupLabel>
              <div className="space-y-1.5">
                <Label htmlFor="prod-name">Nome do produto *</Label>
                <Input
                  id="prod-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={200}
                  placeholder="Ex: ID CARD NFC - Compra unitária"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="prod-desc">Descrição</Label>
                <Textarea
                  id="prod-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={1000}
                  rows={4}
                  placeholder="Detalhes técnicos ou observações…"
                  className="resize-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="prod-sku">SKU</Label>
                <Input
                  id="prod-sku"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  maxLength={100}
                  placeholder="SKU-000"
                  className="font-mono"
                />
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
          </div>

          {/* Right: Financeiro + Categoria */}
          <div className="col-span-12 lg:col-span-5 space-y-6">
            <div className="bg-muted/20 border border-border/60 rounded-xl p-5 space-y-5">
              <FieldGroupLabel>Financeiro</FieldGroupLabel>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="prod-price">Preço de venda (R$) *</Label>
                  <Input
                    id="prod-price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="tabular-nums font-medium"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="prod-cost">Custo (R$)</Label>
                  <Input
                    id="prod-cost"
                    type="number"
                    min="0"
                    step="0.01"
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                    className="tabular-nums font-medium"
                  />
                </div>
              </div>

              <div
                className={cn(
                  "rounded-lg p-4 flex justify-between items-center border",
                  margin < 0
                    ? "bg-destructive/5 border-destructive/30"
                    : "bg-primary/5 border-primary/25",
                )}
              >
                <div>
                  <p
                    className={cn(
                      "text-[10px] uppercase font-bold tracking-widest",
                      margin < 0 ? "text-destructive" : "text-primary",
                    )}
                  >
                    Margem real
                  </p>
                  <p className="text-xs text-muted-foreground">Auto-calculada</p>
                </div>
                <span
                  className={cn(
                    "text-2xl font-bold tabular-nums tracking-tight",
                    margin < 0 ? "text-destructive" : "text-primary",
                  )}
                >
                  {formatPercentPlain(margin)}
                </span>
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
        </div>
    </FormModal>
  );
}
