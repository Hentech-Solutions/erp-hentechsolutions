import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";
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
import { listPlans } from "@/lib/data/plans";
import { updateOrderQuote, type OrderRow } from "@/lib/data/orders";
import { formatBRL } from "@/lib/formatters";

const SEM_CATALOGO = "__sem_catalogo__";

/**
 * Define o valor de um pedido depois do orçamento.
 *
 * O lead chega da landing page sem plano e sem valor de propósito — quem
 * precifica é o atendimento, aqui dentro. Também serve para corrigir um pedido
 * do site cujo valor foi combinado diferente.
 */
export function QuoteForm({
  order,
  open,
  onOpenChange,
  onSaved,
}: {
  order: OrderRow | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved?: () => void;
}) {
  const qc = useQueryClient();
  const { data: plans = [] } = useQuery({
    queryKey: ["plans", "active"],
    queryFn: () => listPlans({ activeOnly: true }),
    enabled: open,
  });

  const [planKey, setPlanKey] = useState<string>(SEM_CATALOGO);
  const [planName, setPlanName] = useState("");
  const [planPrice, setPlanPrice] = useState("");
  const [addQty, setAddQty] = useState("0");
  const [addUnit, setAddUnit] = useState("0");
  const [erro, setErro] = useState<string | null>(null);

  // Recarrega ao abrir para outro pedido: sem isso o formulário mostraria os
  // valores do pedido anterior.
  useEffect(() => {
    if (!open || !order) return;
    setErro(null);
    setPlanKey(order.plan_ref_id ?? SEM_CATALOGO);
    setPlanName(order.plan_name ?? "");
    setPlanPrice(order.plan_price === null ? "" : String(order.plan_price));
    setAddQty(String(order.add_quantity ?? 0));
    setAddUnit(String(order.add_unit_price ?? 0));
  }, [open, order]);

  function pickPlan(key: string) {
    setPlanKey(key);
    if (key === SEM_CATALOGO) return;
    const p = plans.find((x) => x.id === key);
    if (!p) return;
    // Puxa nome e preço do catálogo, mas continua editável: desconto e escopo
    // ajustado são a regra em serviço sob medida, não a exceção.
    setPlanName(p.name);
    setPlanPrice(String(p.price));
    if (p.add_unit_price > 0) setAddUnit(String(p.add_unit_price));
  }

  const price = Number(planPrice.replace(",", ".")) || 0;
  const qty = Math.max(0, Math.trunc(Number(addQty) || 0));
  const unit = Number(addUnit.replace(",", ".")) || 0;
  const addSubtotal = qty * unit;
  const total = price + addSubtotal;

  const salvar = useMutation({
    mutationFn: async () => {
      if (!order) throw new Error("Nenhum pedido selecionado.");
      const plan = plans.find((p) => p.id === planKey);
      await updateOrderQuote(order.id, {
        planRefId: plan?.id ?? null,
        planId: plan?.code ?? null,
        planName: planName.trim(),
        planPrice: price,
        addQuantity: qty,
        addUnitPrice: unit,
      });
    },
    onSuccess: () => {
      toast.success(`Orçamento definido: ${formatBRL(total)}.`, {
        description: "O pedido já pode ser concluído e lançado como venda.",
      });
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["dashboard", "funnel"] });
      qc.invalidateQueries({ queryKey: ["dashboard", "actions"] });
      onOpenChange(false);
      onSaved?.();
    },
    onError: (e: Error) => setErro(e.message),
  });

  function submit() {
    setErro(null);
    if (!planName.trim()) {
      setErro("Descreva o serviço — é esse texto que vai na mensagem de WhatsApp e na venda.");
      return;
    }
    if (price <= 0) {
      setErro("Informe um valor maior que zero.");
      return;
    }
    if (qty > 0 && unit <= 0) {
      setErro("Há adicionais na quantidade, mas o valor unitário está zerado.");
      return;
    }
    salvar.mutate();
  }

  const jaTinhaValor = order?.total !== null && order?.total !== undefined;

  return (
    <FormModal
      open={open}
      onOpenChange={onOpenChange}
      size="2xl"
      title={jaTinhaValor ? "Editar orçamento" : "Definir valor do pedido"}
      description={order ? `${order.code} · ${order.customer_name}` : undefined}
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={salvar.isPending}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={salvar.isPending}>
            {salvar.isPending ? "Salvando..." : "Salvar orçamento"}
          </Button>
        </>
      }
    >
      <div className="grid gap-6">
        <div className="grid gap-3">
          <FieldGroupLabel>Plano</FieldGroupLabel>
          <div className="grid gap-2">
            <Label htmlFor="quote-plan">Plano do catálogo</Label>
            <Select value={planKey} onValueChange={pickPlan}>
              <SelectTrigger id="quote-plan">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SEM_CATALOGO}>Serviço sob medida (fora do catálogo)</SelectItem>
                {plans.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} — {formatBRL(p.price)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {plans.length === 0 ? (
              <p className="flex items-start gap-2 text-xs text-amber-400">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>
                  Nenhum plano ativo cadastrado. Dá para orçar sob medida, mas sem plano o ERP não
                  conhece o custo de produção e a margem sai como 100% — cadastre em{" "}
                  <a href="/planos" className="underline underline-offset-2">
                    Planos
                  </a>
                  .
                </span>
              </p>
            ) : (
              planKey === SEM_CATALOGO && (
                <p className="text-xs text-muted-foreground">
                  Sem plano do catálogo o custo entra como zero e a margem deste pedido sai como
                  100%.
                </p>
              )
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="quote-name">Descrição do serviço</Label>
            <Input
              id="quote-name"
              value={planName}
              onChange={(e) => setPlanName(e.target.value)}
              placeholder="Ex: Sistema de agendamento e financeiro para clínica"
            />
          </div>
        </div>

        <div className="grid gap-3">
          <FieldGroupLabel>Valores</FieldGroupLabel>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="quote-price">Valor do serviço (R$)</Label>
              <Input
                id="quote-price"
                inputMode="decimal"
                value={planPrice}
                onChange={(e) => setPlanPrice(e.target.value)}
                placeholder="0,00"
                className="tabular-nums"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="quote-qty">Adicionais (qtd.)</Label>
              <Input
                id="quote-qty"
                inputMode="numeric"
                value={addQty}
                onChange={(e) => setAddQty(e.target.value)}
                className="tabular-nums"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="quote-unit">Valor unitário (R$)</Label>
              <Input
                id="quote-unit"
                inputMode="decimal"
                value={addUnit}
                onChange={(e) => setAddUnit(e.target.value)}
                className="tabular-nums"
              />
            </div>
          </div>

          {/* Total é derivado, não digitado: valor solto permitiria salvar um
              pedido em que plano + adicionais não fecha com o total. */}
          <div className="flex items-end justify-between rounded-xl border border-border bg-muted/20 px-4 py-3">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Total do pedido
              </div>
              <div className="mt-1 text-xs text-muted-foreground tabular-nums">
                {formatBRL(price)}
                {addSubtotal > 0 && ` + ${qty} × ${formatBRL(unit)} (${formatBRL(addSubtotal)})`}
              </div>
            </div>
            <div className="text-2xl font-semibold tabular-nums">{formatBRL(total)}</div>
          </div>
        </div>

        {erro && (
          <p
            role="alert"
            className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {erro}
          </p>
        )}
      </div>
    </FormModal>
  );
}
