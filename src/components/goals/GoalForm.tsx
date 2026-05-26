import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormModal, FieldGroupLabel } from "@/components/ui/form-modal";
import { createGoal, updateGoal, type GoalPeriod, type SalesGoal } from "@/lib/data/goals";

export function GoalForm({
  trigger,
  initial,
  open: openProp,
  onOpenChange,
}: {
  trigger?: React.ReactNode;
  initial?: SalesGoal;
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = openProp ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [periodType, setPeriodType] = useState<GoalPeriod>("monthly");
  const [target, setTarget] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const qc = useQueryClient();

  useEffect(() => {
    if (!open) return;
    setTitle(initial?.title ?? "");
    setCategory(initial?.category ?? "");
    setPeriodType((initial?.period_type as GoalPeriod) ?? "monthly");
    setTarget(initial ? String(initial.target_value) : "");
    setStartDate(initial?.start_date ?? "");
    setEndDate(initial?.end_date ?? "");
  }, [open, initial]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!title.trim()) throw new Error("Nome é obrigatório");
      if (!category.trim()) throw new Error("Categoria é obrigatória");
      const v = Number(target.replace(",", "."));
      if (!v || v <= 0) throw new Error("Valor alvo inválido");
      if (!startDate || !endDate) throw new Error("Datas obrigatórias");
      if (endDate < startDate) throw new Error("Data fim deve ser maior que início");
      const payload = {
        title: title.trim(),
        category: category.trim(),
        period_type: periodType,
        target_value: v,
        start_date: startDate,
        end_date: endDate,
      };
      return initial ? updateGoal(initial.id, payload) : createGoal(payload);
    },
    onSuccess: () => {
      toast.success(initial ? "Meta atualizada" : "Meta criada");
      qc.invalidateQueries({ queryKey: ["goals"] });
      qc.invalidateQueries({ queryKey: ["goals-metrics"] });
      setOpen(false);
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao salvar"),
  });

  return (
    <FormModal
      open={open}
      onOpenChange={setOpen}
      trigger={trigger}
      title={initial ? "Editar meta" : "Nova meta"}
      description="Defina o alvo de faturamento para o período."
      size="2xl"
      footer={
        <>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending} className="px-6">
            {mutation.isPending ? "Salvando…" : initial ? "Salvar alterações" : "Criar meta"}
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        <div className="space-y-4">
          <FieldGroupLabel>Identificação</FieldGroupLabel>
          <div className="space-y-1.5">
            <Label htmlFor="g-title">Nome da meta *</Label>
            <Input id="g-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="Ex.: Meta de Maio — Geral" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="g-cat">Categoria *</Label>
              <Input id="g-cat" value={category} onChange={(e) => setCategory(e.target.value)} maxLength={80} placeholder="Ex.: Serviços, Produtos…" />
            </div>
            <div className="space-y-1.5">
              <Label>Tipo de período</Label>
              <Select value={periodType} onValueChange={(v) => setPeriodType(v as GoalPeriod)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Semanal</SelectItem>
                  <SelectItem value="monthly">Mensal</SelectItem>
                  <SelectItem value="quarterly">Trimestral</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <FieldGroupLabel>Alvo & período</FieldGroupLabel>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="g-target">Valor alvo (R$) *</Label>
              <Input id="g-target" inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value.replace(/[^\d.,]/g, ""))} placeholder="50000" className="font-mono tabular-nums" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="g-start">Início *</Label>
              <Input id="g-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="g-end">Fim *</Label>
              <Input id="g-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
        </div>
      </div>
    </FormModal>
  );
}