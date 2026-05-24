import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter, SheetDescription } from "@/components/ui/sheet";
import { createEntry, listFinancialCategories } from "@/lib/data/financial";
import { toISODate } from "@/lib/formatters";
import type { Database } from "@/integrations/supabase/types";

type EntryType = Database["public"]["Enums"]["financial_entry_type"];
type Recurrence = Database["public"]["Enums"]["expense_recurrence"];

export function EntryForm({ trigger, defaultType }: { trigger: React.ReactNode; defaultType?: EntryType }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<EntryType>(defaultType ?? "expense");
  const [amount, setAmount] = useState("0");
  const [date, setDate] = useState(toISODate(new Date()));
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [recurrence, setRecurrence] = useState<Recurrence>("one_time");
  const qc = useQueryClient();

  const { data: cats = [] } = useQuery({
    queryKey: ["financial-categories", type],
    queryFn: () => listFinancialCategories(type),
  });

  useEffect(() => {
    if (open && defaultType) setType(defaultType);
  }, [open, defaultType]);
  useEffect(() => { setCategoryId(""); }, [type]);

  const m = useMutation({
    mutationFn: () =>
      createEntry({
        type,
        amount: Number(amount),
        category_id: categoryId,
        reference_date: date,
        description: description || null,
        recurrence,
      }),
    onSuccess: () => {
      toast.success("Lançamento criado");
      qc.invalidateQueries({ queryKey: ["entries"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      setOpen(false);
      setAmount("0"); setDescription("");
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro"),
  });

  const canSave = Number(amount) > 0 && categoryId && date;

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
            <Label>Valor (R$) *</Label>
            <Input type="number" step="0.01" min="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
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
