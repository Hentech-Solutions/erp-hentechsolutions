import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { FormModal, FieldGroupLabel } from "@/components/ui/form-modal";
import { createEntry, listFinancialCategories, VENDA_DE_PRODUTO_CATEGORY_ID, type SaleItemInput } from "@/lib/data/financial";
import { listProducts } from "@/lib/data/products";
import { toISODate, formatBRL } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

type EntryType = Database["public"]["Enums"]["financial_entry_type"];
type Recurrence = Database["public"]["Enums"]["expense_recurrence"];

type LineItem = { product_id: string; quantity: number };

export function EntryForm({ trigger, defaultType }: { trigger: React.ReactNode; defaultType?: EntryType }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<EntryType>(defaultType ?? "expense");
  const [amount, setAmount] = useState("0");
  const [date, setDate] = useState(toISODate(new Date()));
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [recurrence, setRecurrence] = useState<Recurrence>("one_time");
  const [items, setItems] = useState<LineItem[]>([]);
  const [specialPrice, setSpecialPrice] = useState(false);
  const qc = useQueryClient();

  const { data: cats = [] } = useQuery({
    queryKey: ["financial-categories", type],
    queryFn: () => listFinancialCategories(type),
  });

  const isSale = type === "revenue" && categoryId === VENDA_DE_PRODUTO_CATEGORY_ID;
  const productsMode = isSale && !specialPrice;

  const { data: prodPage } = useQuery({
    queryKey: ["products-for-sale"],
    queryFn: () => listProducts({ status: "active", pageSize: 200 }),
    enabled: isSale,
  });
  const products = prodPage?.data ?? [];
  const productById = (id: string) => products.find((p: any) => p.id === id);

  const computedTotal = items.reduce((s, it) => {
    const p: any = productById(it.product_id);
    return s + (p ? Number(p.price) * it.quantity : 0);
  }, 0);

  useEffect(() => {
    if (open && defaultType) setType(defaultType);
  }, [open, defaultType]);
  useEffect(() => { setCategoryId(""); setItems([]); setSpecialPrice(false); }, [type]);
  useEffect(() => { if (!isSale) { setItems([]); setSpecialPrice(false); } }, [isSale]);

  const m = useMutation({
    mutationFn: () => {
      const saleItems: SaleItemInput[] | undefined = productsMode
        ? items
            .filter((it) => it.product_id && it.quantity > 0)
            .map((it) => {
              const p: any = productById(it.product_id)!;
              return {
                product_id: it.product_id,
                quantity: it.quantity,
                unit_price: Number(p.price),
                unit_cost: Number(p.cost ?? 0),
                name: p.name,
              };
            })
        : undefined;
      return createEntry({
        type,
        amount: productsMode ? computedTotal : Number(amount),
        category_id: categoryId,
        reference_date: date,
        description: description || null,
        recurrence: productsMode ? "one_time" : recurrence,
        items: saleItems,
      });
    },
    onSuccess: () => {
      toast.success("Lançamento criado");
      qc.invalidateQueries({ queryKey: ["entries"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["product-sales-count"] });
      setOpen(false);
      setAmount("0"); setDescription(""); setItems([]); setSpecialPrice(false);
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro"),
  });

  const validItems = items.filter((it) => it.product_id && it.quantity > 0);
  const canSave = productsMode
    ? validItems.length > 0 && computedTotal > 0 && categoryId && date
    : Number(amount) > 0 && categoryId && date;

  const addItem = () => setItems((arr) => [...arr, { product_id: "", quantity: 1 }]);
  const updateItem = (i: number, patch: Partial<LineItem>) =>
    setItems((arr) => arr.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  const removeItem = (i: number) => setItems((arr) => arr.filter((_, idx) => idx !== i));

  return (
    <FormModal
      open={open}
      onOpenChange={setOpen}
      trigger={trigger}
      title="Novo lançamento"
      description="Registre receitas, despesas, aportes, investimentos e retiradas."
      size="3xl"
      footer={
        <>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={() => m.mutate()} disabled={!canSave || m.isPending} className="px-6">
            {m.isPending ? "Salvando…" : "Criar lançamento"}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-12 gap-8">
        {/* Left column: classification */}
        <div className="col-span-12 lg:col-span-7 space-y-6">
          <div className="space-y-4">
            <FieldGroupLabel>Classificação</FieldGroupLabel>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Tipo *</Label>
                <Select value={type} onValueChange={(v: EntryType) => setType(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="revenue">Receita</SelectItem>
                    <SelectItem value="expense">Despesa</SelectItem>
                    <SelectItem value="capital_in">Aporte de capital</SelectItem>
                    <SelectItem value="investment">Investimento</SelectItem>
                    <SelectItem value="withdrawal">Retirada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Data de competência *</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Categoria *</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
                <SelectContent>
                  {cats.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {!productsMode && (
              <div className="space-y-1.5">
                <Label>Recorrência</Label>
                <Select value={recurrence} onValueChange={(v: Recurrence) => setRecurrence(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="one_time">Avulso</SelectItem>
                    <SelectItem value="monthly">Mensal (12x)</SelectItem>
                    <SelectItem value="quarterly">Trimestral (12x)</SelectItem>
                    <SelectItem value="annual">Anual (12x)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Descrição</Label>
            <Textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              placeholder="Observações sobre o lançamento…"
              className="resize-none"
            />
          </div>
        </div>

        {/* Right column: value / products */}
        <div className="col-span-12 lg:col-span-5 space-y-6">
          <div className="bg-muted/20 border border-border/60 rounded-xl p-5 space-y-5">
            <div className="flex items-center justify-between">
              <FieldGroupLabel>{productsMode ? "Produtos vendidos" : "Valor"}</FieldGroupLabel>
              {isSale && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    id="special-price"
                    checked={specialPrice}
                    onCheckedChange={(v) => setSpecialPrice(Boolean(v))}
                  />
                  <span className="text-[11px] text-muted-foreground">Valor especial</span>
                </label>
              )}
            </div>

            {productsMode ? (
              <div className="space-y-3">
                {items.length === 0 && (
                  <p className="text-xs text-muted-foreground py-2 text-center border border-dashed border-border/60 rounded-lg">
                    Nenhum produto adicionado.
                  </p>
                )}
                {items.map((it, i) => {
                  const p: any = productById(it.product_id);
                  return (
                    <div key={i} className="flex gap-2 items-start">
                      <div className="flex-1 space-y-1">
                        <Select value={it.product_id} onValueChange={(v) => updateItem(i, { product_id: v })}>
                          <SelectTrigger className="h-9"><SelectValue placeholder="Produto…" /></SelectTrigger>
                          <SelectContent>
                            {products.map((pr: any) => (
                              <SelectItem key={pr.id} value={pr.id}>
                                {pr.name} — {formatBRL(pr.price)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {p && (
                          <p className="text-[10px] text-muted-foreground tabular-nums pl-1">
                            {it.quantity} × {formatBRL(p.price)} = {formatBRL(Number(p.price) * it.quantity)}
                          </p>
                        )}
                      </div>
                      <Input
                        type="number"
                        min="1"
                        step="1"
                        className="w-16 tabular-nums"
                        value={it.quantity}
                        onChange={(e) => updateItem(i, { quantity: Math.max(1, Number(e.target.value) || 0) })}
                      />
                      <Button type="button" size="icon" variant="ghost" onClick={() => removeItem(i)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
                <Button type="button" size="sm" variant="outline" onClick={addItem} className="w-full">
                  <Plus className="h-3.5 w-3.5 mr-1" />Adicionar produto
                </Button>

                <div className="rounded-lg p-4 flex justify-between items-center border bg-primary/5 border-primary/25">
                  <div>
                    <p className="text-[10px] uppercase font-bold tracking-widest text-primary">Total</p>
                    <p className="text-xs text-muted-foreground">
                      {validItems.length} {validItems.length === 1 ? "item" : "itens"}
                    </p>
                  </div>
                  <span className="text-2xl font-bold tabular-nums tracking-tight text-primary">
                    {formatBRL(computedTotal)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="entry-amount">Valor (R$) *</Label>
                  <Input
                    id="entry-amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="tabular-nums font-medium text-lg h-11"
                  />
                </div>
                {Number(amount) > 0 && (
                  <div
                    className={cn(
                      "rounded-lg p-4 flex justify-between items-center border",
                      type === "revenue" || type === "capital_in" || type === "investment"
                        ? "bg-success/5 border-success/25"
                        : "bg-destructive/5 border-destructive/25",
                    )}
                  >
                    <div>
                      <p
                        className={cn(
                          "text-[10px] uppercase font-bold tracking-widest",
                          type === "revenue" || type === "capital_in" || type === "investment"
                            ? "text-success"
                            : "text-destructive",
                        )}
                      >
                        Impacto
                      </p>
                      <p className="text-xs text-muted-foreground">no fluxo de caixa</p>
                    </div>
                    <span
                      className={cn(
                        "text-xl font-bold tabular-nums tracking-tight",
                        type === "revenue" || type === "capital_in" || type === "investment"
                          ? "text-success"
                          : "text-destructive",
                      )}
                    >
                      {type === "revenue" || type === "capital_in" || type === "investment" ? "+" : "−"}
                      {" "}
                      {formatBRL(Number(amount))}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </FormModal>
  );
}
