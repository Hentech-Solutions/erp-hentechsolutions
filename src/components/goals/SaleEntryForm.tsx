import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormModal } from "@/components/ui/form-modal";
import { addSaleEntry, findGoalByProduct, type SalesGoal } from "@/lib/data/goals";
import { listProducts } from "@/lib/data/products";

export function SaleEntryForm({
  goal,
  open,
  onOpenChange,
}: {
  goal: SalesGoal;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const [productId, setProductId] = useState<string>("none");
  const [linkedGoalName, setLinkedGoalName] = useState<string | null>(null);
  const qc = useQueryClient();

  const products = useQuery({
    queryKey: ["products", "for-goals"],
    queryFn: () => listProducts({ status: "active", pageSize: 200 }),
    enabled: open,
  });

  useEffect(() => {
    if (!open) return;
    setAmount("");
    setDate(new Date().toISOString().slice(0, 10));
    setNote("");
    setProductId((goal as any)?.product_id ?? "none");
    setLinkedGoalName(null);
  }, [open, goal]);

  useEffect(() => {
    if (productId === "none") { setLinkedGoalName(null); return; }
    let alive = true;
    findGoalByProduct(productId).then((g) => {
      if (alive) setLinkedGoalName(g?.title ?? null);
    }).catch(() => alive && setLinkedGoalName(null));
    return () => { alive = false; };
  }, [productId]);

  const mutation = useMutation({
    mutationFn: async () => {
      const v = Number(amount.replace(",", "."));
      if (!v || v <= 0) throw new Error("Valor inválido");
      if (!date) throw new Error("Data obrigatória");
      return addSaleEntry({
        goal_id: goal.id,
        amount: v,
        sale_date: date,
        note: note.trim() || null,
        product_id: productId === "none" ? null : productId,
      });
    },
    onSuccess: () => {
      toast.success("Venda lançada");
      qc.invalidateQueries({ queryKey: ["goals"] });
      qc.invalidateQueries({ queryKey: ["goals-metrics"] });
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao lançar"),
  });

  return (
    <FormModal
      open={open}
      onOpenChange={onOpenChange}
      title={`Lançar venda — ${goal.title}`}
      description="Registre o valor de venda contabilizado para esta meta."
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending} className="px-6">
            {mutation.isPending ? "Salvando…" : "Lançar venda"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="se-amount">Valor (R$) *</Label>
            <Input id="se-amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.,]/g, ""))} placeholder="0,00" className="font-mono tabular-nums" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="se-date">Data *</Label>
            <Input id="se-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Produto</Label>
          <Select value={productId} onValueChange={setProductId}>
            <SelectTrigger>
              <SelectValue placeholder="Opcional — selecione um produto" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sem produto</SelectItem>
              {(products.data?.data ?? []).map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {linkedGoalName && (
            <p className="text-xs text-primary rounded-md bg-primary/10 border border-primary/30 px-3 py-2 mt-1">
              Este lançamento será contabilizado automaticamente na meta: <strong>{linkedGoalName}</strong>
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="se-note">Observação</Label>
          <Textarea id="se-note" value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={500} className="resize-none" placeholder="Detalhes opcionais…" />
        </div>
      </div>
    </FormModal>
  );
}