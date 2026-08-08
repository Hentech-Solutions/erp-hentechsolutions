import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormModal, FieldGroupLabel } from "@/components/ui/form-modal";
import {
  createGoal,
  findGoalByProduct,
  updateGoal,
  GOAL_TYPE_HINT,
  type GoalPeriod,
  type GoalType,
  type SalesGoal,
} from "@/lib/data/goals";
import { listProducts } from "@/lib/data/products";
import { cn } from "@/lib/utils";

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
  const [productId, setProductId] = useState<string>("none");
  const [goalType, setGoalType] = useState<GoalType>("revenue");
  const qc = useQueryClient();

  const products = useQuery({
    queryKey: ["products", "for-goals"],
    queryFn: () => listProducts({ status: "active", pageSize: 200 }),
    enabled: open,
  });

  useEffect(() => {
    if (!open) return;
    setTitle(initial?.title ?? "");
    setCategory(initial?.category ?? "");
    setPeriodType((initial?.period_type as GoalPeriod) ?? "monthly");
    setTarget(initial ? String(initial.target_value) : "");
    setStartDate(initial?.start_date ?? "");
    setEndDate(initial?.end_date ?? "");
    setProductId((initial as any)?.product_id ?? "none");
    setGoalType(
      (initial?.goal_type as GoalType) ??
        ((initial as any)?.product_id ? "product" : initial ? "manual" : "revenue"),
    );
  }, [open, initial]);

  // período padrão do mês corrente quando o usuário ainda não escolheu datas
  useEffect(() => {
    if (!open || initial || startDate || endDate) return;
    const now = new Date();
    const iso = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    setStartDate(iso(new Date(now.getFullYear(), now.getMonth(), 1)));
    setEndDate(iso(new Date(now.getFullYear(), now.getMonth() + 1, 0)));
  }, [open, initial, startDate, endDate]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!title.trim()) throw new Error("Nome é obrigatório");
      if (!category.trim()) throw new Error("Categoria é obrigatória");
      const v = Number(target.replace(",", "."));
      if (!v || v <= 0) throw new Error("Valor alvo inválido");
      if (!startDate || !endDate) throw new Error("Datas obrigatórias");
      if (endDate < startDate) throw new Error("Data fim deve ser maior que início");

      // só meta por produto carrega vínculo
      const linkedProduct = goalType === "product" && productId !== "none" ? productId : null;
      if (goalType === "product" && !linkedProduct) {
        throw new Error("Selecione o produto da meta");
      }

      if (linkedProduct) {
        const existing = await findGoalByProduct(linkedProduct);
        if (existing && existing.id !== initial?.id) {
          throw new Error("Já existe uma meta ativa para este produto.");
        }
      }

      const payload: any = {
        title: title.trim(),
        category: category.trim(),
        period_type: periodType,
        goal_type: goalType,
        target_value: v,
        start_date: startDate,
        end_date: endDate,
        product_id: linkedProduct,
      };
      // For new goals, goal_start_date defaults to today (DB default). On edit, keep existing.
      if (!initial && linkedProduct) {
        payload.goal_start_date = new Date().toISOString().slice(0, 10);
      }
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
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending} className="px-6">
            {mutation.isPending ? "Salvando…" : initial ? "Salvar alterações" : "Criar meta"}
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        <div className="space-y-4">
          <FieldGroupLabel>O que a meta acompanha</FieldGroupLabel>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {(["revenue", "product", "manual"] as GoalType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setGoalType(t)}
                aria-pressed={goalType === t}
                className={cn(
                  "rounded-lg border p-3 text-left transition",
                  goalType === t
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-border/80 hover:bg-accent/40",
                )}
              >
                <div className="text-sm font-medium">
                  {t === "revenue" ? "Faturamento" : t === "product" ? "Por produto" : "Manual"}
                </div>
                <div className="mt-0.5 text-[11px] text-muted-foreground">{GOAL_TYPE_HINT[t]}</div>
              </button>
            ))}
          </div>
          {goalType === "revenue" && (
            <p className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
              Toda receita lançada no período entra sozinha: pedido concluído, venda avulsa ou
              lançamento manual no Centro Financeiro. Você não precisa alimentar a meta.
            </p>
          )}
        </div>

        <div className="space-y-4">
          <FieldGroupLabel>Identificação</FieldGroupLabel>
          <div className="space-y-1.5">
            <Label htmlFor="g-title">Nome da meta *</Label>
            <Input
              id="g-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              placeholder="Ex.: Meta de Maio — Geral"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="g-cat">Categoria *</Label>
              <Input
                id="g-cat"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                maxLength={80}
                placeholder="Ex.: Serviços, Produtos…"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Tipo de período</Label>
              <Select value={periodType} onValueChange={(v) => setPeriodType(v as GoalPeriod)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
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
              <Input
                id="g-target"
                inputMode="decimal"
                value={target}
                onChange={(e) => setTarget(e.target.value.replace(/[^\d.,]/g, ""))}
                placeholder="50000"
                className="font-mono tabular-nums"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="g-start">Início *</Label>
              <Input
                id="g-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="g-end">Fim *</Label>
              <Input
                id="g-end"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        </div>

        {goalType === "product" && (
          <div className="space-y-4">
            <FieldGroupLabel>Vínculo com produto</FieldGroupLabel>
            <div className="space-y-1.5">
              <Label>Produto da meta *</Label>
              <Select value={productId} onValueChange={setProductId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um produto" />
                </SelectTrigger>
                <SelectContent>
                  {(products.data?.data ?? []).map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {productId !== "none" && (
                <p className="text-xs text-muted-foreground rounded-md bg-muted/50 border border-border px-3 py-2 mt-1">
                  A partir de hoje, novos lançamentos de venda deste produto serão contabilizados
                  automaticamente nesta meta.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </FormModal>
  );
}
