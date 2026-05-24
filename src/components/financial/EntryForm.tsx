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
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter, SheetDescription } from "@/components/ui/sheet";
import { createEntry, listFinancialCategories, VENDA_DE_PRODUTO_CATEGORY_ID, type SaleItemInput } from "@/lib/data/financial";
import { listProducts } from "@/lib/data/products";
import { toISODate, formatBRL } from "@/lib/formatters";
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
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent className="sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Novo lançamento</SheetTitle>
          <SheetDescription>Receitas, despesas, aportes e retiradas.</SheetDescription>
        </SheetHeader>
        <div className="px-4 py-4 space-y-4">
          <div className="space-y-1.5">
            <Label>Tipo</Label>
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
          <div className="space-y-1.5">
            <Label>Categoria *</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
              <SelectContent>
                {cats.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {isSale && (
            <div className="rounded-lg border border-border p-3 space-y-3 bg-muted/20">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="special-price"
                  checked={specialPrice}
                  onCheckedChange={(v) => setSpecialPrice(Boolean(v))}
                />
                <Label htmlFor="special-price" className="cursor-pointer text-xs">
                  Condição de valor especial
                </Label>
              </div>
              {productsMode && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Produtos vendidos *</Label>
                    <Button type="button" size="sm" variant="ghost" onClick={addItem}>
                      <Plus className="h-3 w-3 mr-1" />Adicionar
                    </Button>
                  </div>
                  {items.length === 0 && (
                    <p className="text-xs text-muted-foreground">Nenhum produto adicionado.</p>
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
                            <p className="text-[10px] text-muted-foreground tabular-nums">
                              {it.quantity} × {formatBRL(p.price)} = {formatBRL(Number(p.price) * it.quantity)}
                            </p>
                          )}
                        </div>
                        <Input
                          type="number"
                          min="1"
                          step="1"
                          className="w-20"
                          value={it.quantity}
                          onChange={(e) => updateItem(i, { quantity: Math.max(1, Number(e.target.value) || 0) })}
                        />
                        <Button type="button" size="icon" variant="ghost" onClick={() => removeItem(i)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })}
                  <div className="flex justify-between border-t border-border pt-2 text-sm">
                    <span className="text-muted-foreground">Total</span>
                    <span className="tabular-nums font-semibold">{formatBRL(computedTotal)}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {!productsMode && (
            <div className="space-y-1.5">
              <Label>Valor (R$) *</Label>
              <Input type="number" step="0.01" min="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
          )}

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
          <div className="space-y-1.5">
            <Label>Descrição</Label>
            <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} />
          </div>
        </div>
        <SheetFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={() => m.mutate()} disabled={!canSave || m.isPending}>
            {m.isPending ? "Salvando…" : "Criar"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
