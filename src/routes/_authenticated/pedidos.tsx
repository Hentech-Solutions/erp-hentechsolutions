import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageCircle, Play, CheckCircle2, XCircle, Trash2, Inbox, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  listOrders,
  updateOrderStatus,
  deleteOrder,
  buildWhatsappUrl,
  STATUS_LABEL,
  type OrderRow,
  type OrderStatus,
} from "@/lib/data/orders";
import { formatBRL, formatDate } from "@/lib/formatters";

export const Route = createFileRoute("/_authenticated/pedidos")({
  head: () => ({ meta: [{ title: "Pedidos — Gestão Empresarial" }] }),
  component: PedidosPage,
});

const FILTERS: { value: OrderStatus | "all"; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "pendente", label: "Pendentes" },
  { value: "em_execucao", label: "Em execução" },
  { value: "concluido", label: "Concluídos" },
  { value: "cancelado", label: "Cancelados" },
];

const STATUS_STYLE: Record<OrderStatus, string> = {
  pendente: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  em_execucao: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  concluido: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  cancelado: "bg-rose-500/15 text-rose-400 border-rose-500/30",
};

function PedidosPage() {
  const [filter, setFilter] = useState<OrderStatus | "all">("all");
  const qc = useQueryClient();
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["orders", filter],
    queryFn: () => listOrders(filter),
  });

  function chatUrl(o: OrderRow) {
    const msg = `Olá ${o.customer_name}, sobre o seu pedido ${o.code} (plano ${o.plan_name}).`;
    return buildWhatsappUrl(o.customer_whatsapp, msg);
  }

  function execMessage(o: OrderRow) {
    return (
      `Olá ${o.customer_name}! 🎉\n\n` +
      `Seu pedido *${o.code}* (plano *${o.plan_name}*) entrou em execução.\n` +
      `Total: ${formatBRL(o.total)}.\n\n` +
      `Em breve entraremos em contato com mais detalhes.`
    );
  }

  async function changeStatus(o: OrderRow, status: OrderStatus) {
    try {
      if (status === "em_execucao") {
        window.open(buildWhatsappUrl(o.customer_whatsapp, execMessage(o)), "_blank", "noopener");
        await updateOrderStatus(o.id, status, { notified: true });
        toast.success("Pedido em execução. WhatsApp aberto para notificação.");
      } else {
        await updateOrderStatus(o.id, status);
        toast.success(`Status atualizado para "${STATUS_LABEL[status]}".`);
      }
      qc.invalidateQueries({ queryKey: ["orders"] });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao atualizar pedido");
    }
  }

  async function handleDelete(o: OrderRow) {
    if (!confirm(`Excluir pedido ${o.code}?`)) return;
    try {
      await deleteOrder(o.id);
      toast.success("Pedido excluído.");
      qc.invalidateQueries({ queryKey: ["orders"] });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao excluir");
    }
  }

  return (
    <AppShell title="Pedidos">
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Pedidos recebidos</h2>
            <p className="text-sm text-muted-foreground">
              Pedidos recebidos via integração externa. Atualize o status e notifique o cliente.
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5 rounded-lg border border-border bg-card p-1">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`px-3 py-1.5 text-xs rounded-md transition ${
                  filter === f.value
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="text-sm text-muted-foreground">Carregando...</div>
        ) : orders.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card/40 p-12 text-center">
            <Inbox className="mx-auto h-8 w-8 text-muted-foreground/60" />
            <p className="mt-3 text-sm text-muted-foreground">Nenhum pedido encontrado.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {orders.map((o) => (
              <article
                key={o.id}
                className="rounded-xl border border-border bg-card p-5 hover:border-primary/40 transition"
              >
                <header className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-border/60">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">
                        {o.code}
                      </span>
                      <Badge variant="outline" className={STATUS_STYLE[o.status]}>
                        {STATUS_LABEL[o.status]}
                      </Badge>
                      <span className="text-[11px] text-muted-foreground">
                        recebido em {formatDate(o.created_at)}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold tracking-tight truncate">
                      {o.customer_name}
                      {o.customer_company && (
                        <span className="text-muted-foreground font-normal"> · {o.customer_company}</span>
                      )}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {o.customer_email} · {o.customer_whatsapp}
                      {o.customer_role && ` · ${o.customer_role}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-semibold tabular-nums">{formatBRL(o.total)}</div>
                    <div className="text-[11px] text-muted-foreground">{o.currency}</div>
                  </div>
                </header>

                <div className="grid sm:grid-cols-2 gap-4 py-4 text-sm">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Plano</div>
                    <div>
                      <span className="font-medium">{o.plan_name}</span>{" "}
                      <span className="text-muted-foreground">— {formatBRL(o.plan_price)}</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Adicionais</div>
                    <div>
                      {o.add_quantity > 0 ? (
                        <>
                          {o.add_quantity} × {formatBRL(o.add_unit_price)} ={" "}
                          <span className="font-medium">{formatBRL(o.add_subtotal)}</span>
                          {o.add_discount_applied && (
                            <span className="ml-2 text-emerald-400 text-xs">
                              -{formatBRL(o.add_saving)} desconto
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-muted-foreground">Sem adicionais</span>
                      )}
                    </div>
                  </div>
                  {o.notes && (
                    <div className="sm:col-span-2">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Observações</div>
                      <p className="text-muted-foreground whitespace-pre-wrap">{o.notes}</p>
                    </div>
                  )}
                </div>

                <footer className="flex flex-wrap gap-2 pt-3 border-t border-border/60">
                  <a href={chatUrl(o)} target="_blank" rel="noopener noreferrer">
                    <Button size="sm" variant="outline">
                      <MessageCircle className="h-3.5 w-3.5" /> Conversar no WhatsApp
                    </Button>
                  </a>
                  {o.status !== "em_execucao" && o.status !== "concluido" && (
                    <Button size="sm" onClick={() => changeStatus(o, "em_execucao")}>
                      <Play className="h-3.5 w-3.5" /> Em execução & notificar
                    </Button>
                  )}
                  {o.status === "em_execucao" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => changeStatus(o, "concluido")}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" /> Concluir
                    </Button>
                  )}
                  {o.status !== "cancelado" && o.status !== "concluido" && (
                    <Button size="sm" variant="outline" onClick={() => changeStatus(o, "cancelado")}>
                      <XCircle className="h-3.5 w-3.5" /> Cancelar
                    </Button>
                  )}
                  {(o.status === "concluido" || o.status === "cancelado") && (
                    <Button size="sm" variant="outline" onClick={() => changeStatus(o, "pendente")}>
                      <RotateCcw className="h-3.5 w-3.5" /> Reabrir
                    </Button>
                  )}
                  <div className="ml-auto">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(o)}
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Excluir
                    </Button>
                  </div>
                </footer>
              </article>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}