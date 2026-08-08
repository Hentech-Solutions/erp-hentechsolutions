import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Layers, Plus, Pencil, Trash2, AlertTriangle } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { FormModal } from "@/components/ui/form-modal";
import {
  listPlans,
  createPlan,
  updatePlan,
  softDeletePlan,
  getPriceMismatches,
  planMargin,
  addMargin,
  type Plan,
  type PlanInput,
} from "@/lib/data/plans";
import { formatBRL, formatPercentPlain, formatDate } from "@/lib/formatters";
import { useUserRole } from "@/hooks/use-user-role";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/planos")({
  head: () => ({ meta: [{ title: "Planos — Hentech ERP" }] }),
  component: PlanosPage,
});

function PlanosPage() {
  const qc = useQueryClient();
  const { isStaff, isAdmin } = useUserRole();
  const [editing, setEditing] = useState<Plan | null>(null);
  const [creating, setCreating] = useState(false);

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ["plans"],
    queryFn: () => listPlans(),
  });
  const { data: mismatches = [] } = useQuery({
    queryKey: ["plans", "mismatches"],
    queryFn: getPriceMismatches,
  });

  const del = useMutation({
    mutationFn: softDeletePlan,
    onSuccess: () => {
      toast.success("Plano removido");
      qc.invalidateQueries({ queryKey: ["plans"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppShell title="Planos">
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Catálogo de planos</h2>
            <p className="text-sm text-muted-foreground">
              Preço e, principalmente, <strong className="text-foreground">custo</strong> — o site
              não sabe quanto custa produzir, então a margem sai daqui
            </p>
          </div>
          {isStaff && (
            <Button onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4 mr-1" /> Novo plano
            </Button>
          )}
        </div>

        {plans.length === 0 && !isLoading && (
          <div className="rounded-xl border border-warning/40 bg-warning/5 p-5 flex gap-3">
            <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
            <div className="text-sm space-y-1">
              <p className="font-medium">Nenhum plano cadastrado.</p>
              <p className="text-muted-foreground">
                Enquanto o catálogo estiver vazio, todo pedido registrado entra com custo zero e
                margem de 100% no DRE. Cadastre os planos que você vende no site — o campo{" "}
                <code className="text-xs">código</code> precisa bater com o{" "}
                <code className="text-xs">plan_id</code> que o site envia no pedido.
              </p>
            </div>
          </div>
        )}

        {mismatches.length > 0 && (
          <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-5">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <h3 className="text-sm font-medium">
                {mismatches.length} pedido(s) com preço diferente do catálogo
              </h3>
            </div>
            <div className="space-y-1.5">
              {mismatches.slice(0, 5).map((m) => (
                <div key={m.order_id} className="flex flex-wrap items-baseline gap-x-3 text-xs">
                  <span className="font-mono">{m.code}</span>
                  <span className="text-muted-foreground">{m.plan_name}</span>
                  <span className="tabular-nums">
                    site {formatBRL(m.site_price)} · catálogo {formatBRL(m.catalog_price)}
                  </span>
                  <span
                    className={cn(
                      "tabular-nums font-medium",
                      m.diff > 0 ? "text-success" : "text-destructive",
                    )}
                  >
                    {m.diff > 0 ? "+" : ""}
                    {formatBRL(m.diff)}
                  </span>
                  <span className="text-muted-foreground/70">{formatDate(m.ordered_at)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="kanban-scroll overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-3">Plano</th>
                  <th className="text-left px-4 py-3">Código</th>
                  <th className="text-right px-4 py-3">Preço</th>
                  <th className="text-right px-4 py-3">Custo</th>
                  <th className="text-right px-4 py-3">Margem</th>
                  <th className="text-right px-4 py-3">Adicional</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-right px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-muted-foreground">
                      Carregando…
                    </td>
                  </tr>
                )}
                {!isLoading && plans.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-12 text-center">
                      <Layers className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground mb-4">Nenhum plano cadastrado</p>
                      {isStaff && (
                        <Button size="sm" onClick={() => setCreating(true)}>
                          <Plus className="h-4 w-4 mr-1" /> Cadastrar o primeiro
                        </Button>
                      )}
                    </td>
                  </tr>
                )}
                {plans.map((p) => {
                  const margin = planMargin(p);
                  return (
                    <tr
                      key={p.id}
                      className="border-t border-border hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium">{p.name}</div>
                        {p.description && (
                          <div className="text-xs text-muted-foreground">{p.description}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        {p.code}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">{formatBRL(p.price)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                        {formatBRL(p.unit_cost)}
                      </td>
                      <td
                        className={cn(
                          "px-4 py-3 text-right tabular-nums font-medium",
                          margin >= 50
                            ? "text-success"
                            : margin >= 20
                              ? "text-warning"
                              : "text-destructive",
                        )}
                      >
                        {formatPercentPlain(margin)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-xs text-muted-foreground">
                        {formatBRL(p.add_unit_price)}
                        <span className="mx-1">/</span>
                        {formatBRL(p.add_unit_cost)}
                        <div className="text-[10px]">{formatPercentPlain(addMargin(p))} margem</div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={p.is_active ? "secondary" : "outline"}
                          className="text-[10px]"
                        >
                          {p.is_active ? "Ativo" : "Inativo"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        {isStaff && (
                          <Button size="icon" variant="ghost" onClick={() => setEditing(p)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        {isAdmin && (
                          <Button size="icon" variant="ghost" onClick={() => del.mutate(p.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {(creating || editing) && (
        <PlanFormModal
          plan={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
        />
      )}
    </AppShell>
  );
}

function PlanFormModal({ plan, onClose }: { plan: Plan | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<PlanInput>({
    code: plan?.code ?? "",
    name: plan?.name ?? "",
    description: plan?.description ?? "",
    price: plan?.price ?? 0,
    unit_cost: plan?.unit_cost ?? 0,
    add_unit_price: plan?.add_unit_price ?? 0,
    add_unit_cost: plan?.add_unit_cost ?? 0,
    is_active: plan?.is_active ?? true,
    sort_order: plan?.sort_order ?? 0,
  });

  const save = useMutation({
    mutationFn: () => (plan ? updatePlan(plan.id, form) : createPlan(form)),
    onSuccess: () => {
      toast.success(plan ? "Plano atualizado" : "Plano criado");
      qc.invalidateQueries({ queryKey: ["plans"] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const num = (k: keyof PlanInput) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: Number(e.target.value) || 0 }));

  const margin = form.price > 0 ? ((form.price - form.unit_cost) / form.price) * 100 : 0;

  const canSave = form.code.trim() !== "" && form.name.trim() !== "";

  return (
    <FormModal
      open
      onOpenChange={(o) => !o && onClose()}
      title={plan ? "Editar plano" : "Novo plano"}
      description="O código precisa ser igual ao plan_id que o site envia no pedido."
      size="2xl"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={save.isPending}>
            Cancelar
          </Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending || !canSave}>
            {save.isPending ? "Salvando…" : plan ? "Salvar" : "Criar plano"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              value={form.name}
              required
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="code">Código (plan_id do site)</Label>
            <Input
              id="code"
              value={form.code}
              required
              className="font-mono"
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="description">Descrição</Label>
          <Textarea
            id="description"
            rows={2}
            value={form.description ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="price">Preço de venda</Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              min="0"
              value={form.price}
              onChange={num("price")}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="unit_cost">Custo de produção</Label>
            <Input
              id="unit_cost"
              type="number"
              step="0.01"
              min="0"
              value={form.unit_cost}
              onChange={num("unit_cost")}
            />
          </div>
        </div>

        <div className="rounded-md bg-muted/40 px-3 py-2 text-xs flex justify-between">
          <span className="text-muted-foreground">Margem do plano</span>
          <span
            className={cn(
              "tabular-nums font-medium",
              margin >= 50 ? "text-success" : margin >= 20 ? "text-warning" : "text-destructive",
            )}
          >
            {formatPercentPlain(margin)} · {formatBRL(form.price - form.unit_cost)} por venda
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="add_unit_price">Preço do cartão adicional</Label>
            <Input
              id="add_unit_price"
              type="number"
              step="0.01"
              min="0"
              value={form.add_unit_price}
              onChange={num("add_unit_price")}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="add_unit_cost">Custo do cartão adicional</Label>
            <Input
              id="add_unit_cost"
              type="number"
              step="0.01"
              min="0"
              value={form.add_unit_cost}
              onChange={num("add_unit_cost")}
            />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-md border border-border px-3 py-2.5">
          <div>
            <Label htmlFor="is_active" className="cursor-pointer">
              Plano ativo
            </Label>
            <p className="text-xs text-muted-foreground">Inativo não aparece para novos pedidos</p>
          </div>
          <Switch
            id="is_active"
            checked={form.is_active ?? true}
            onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))}
          />
        </div>
      </div>
    </FormModal>
  );
}
