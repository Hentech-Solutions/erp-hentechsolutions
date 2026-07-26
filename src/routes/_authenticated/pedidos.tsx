import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageCircle, Play, CheckCircle2, XCircle, Trash2, Inbox, RotateCcw, LayoutGrid, List, GripVertical } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
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
  { value: "pendente", label: "Entrada" },
  { value: "em_negociacao", label: "Em negociação" },
  { value: "em_execucao", label: "Em execução" },
  { value: "pronto_entrega", label: "Pronto p/ entrega" },
  { value: "concluido", label: "Concluídos" },
  { value: "cancelado", label: "Cancelados" },
];

const STATUS_STYLE: Record<OrderStatus, string> = {
  pendente: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  em_negociacao: "bg-violet-500/15 text-violet-400 border-violet-500/30",
  em_execucao: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  pronto_entrega: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
  concluido: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  cancelado: "bg-rose-500/15 text-rose-400 border-rose-500/30",
};

const KANBAN_COLUMNS: { status: OrderStatus; accent: string }[] = [
  { status: "pendente", accent: "border-t-amber-500/60" },
  { status: "em_negociacao", accent: "border-t-violet-500/60" },
  { status: "em_execucao", accent: "border-t-blue-500/60" },
  { status: "pronto_entrega", accent: "border-t-cyan-500/60" },
  { status: "concluido", accent: "border-t-emerald-500/60" },
  { status: "cancelado", accent: "border-t-rose-500/60" },
];

const NOTIFY_STATUSES: OrderStatus[] = ["em_negociacao", "em_execucao", "pronto_entrega"];

function PedidosPage() {
  const [filter, setFilter] = useState<OrderStatus | "all">("all");
  const [view, setView] = useState<"list" | "kanban">("kanban");
  const [dragOverCol, setDragOverCol] = useState<OrderStatus | null>(null);
  const [execTarget, setExecTarget] = useState<{ order: OrderRow; status: OrderStatus } | null>(null);
  const [execMsg, setExecMsg] = useState("");
  const [execSubmitting, setExecSubmitting] = useState(false);
  const qc = useQueryClient();
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["orders", filter],
    queryFn: () => listOrders(filter),
  });

  function chatUrl(o: OrderRow) {
    const msg = `Olá ${o.customer_name}, sobre o seu pedido ${o.code} (plano ${o.plan_name}).`;
    return buildWhatsappUrl(o.customer_whatsapp, msg);
  }

  function statusMessage(o: OrderRow, status: OrderStatus) {
    const adicionais =
      o.add_quantity > 0
        ? `\nAdicionais: ${o.add_quantity} × ${formatBRL(o.add_unit_price)} = ${formatBRL(o.add_subtotal)}`
        : "";
    if (status === "em_negociacao") {
      return (
        `Olá ${o.customer_name}! Tudo bem? 👋\n\n` +
        `Aqui é da Hentech Solutions. Recebemos o seu pedido *${o.code}* e passo as informações para confirmarmos:\n\n` +
        `• Plano: ${o.plan_name} — ${formatBRL(o.plan_price)}${adicionais}\n` +
        `• Valor total: *${formatBRL(o.total)}*\n\n` +
        `A forma de pagamento é via *PIX*.\n\n` +
        `Podemos seguir com a negociação e iniciar os processos?`
      );
    }
    if (status === "pronto_entrega") {
      return (
        `Olá ${o.customer_name}! ✅\n\n` +
        `Seu pedido *${o.code}* (${o.plan_name}) está *pronto*!\n\n` +
        `Qual a melhor forma para realizarmos a entrega?\n` +
        `1️⃣ Retirar em local combinado\n` +
        `2️⃣ Entrega pelos Correios (+ taxas)\n` +
        `3️⃣ Uber Flash\n` +
        `4️⃣ 99 Entregas\n\n` +
        `Nos diga a opção preferida que já organizamos tudo.`
      );
    }
    return (
      `Olá ${o.customer_name}! 🎉\n\n` +
      `Seu pedido *${o.code}* (plano *${o.plan_name}*) entrou em execução.\n` +
      `Total: ${formatBRL(o.total)}.\n\n` +
      `Em breve entraremos em contato com mais detalhes.`
    );
  }

  async function changeStatus(o: OrderRow, status: OrderStatus) {
    if (NOTIFY_STATUSES.includes(status)) {
      setExecTarget({ order: o, status });
      setExecMsg(statusMessage(o, status));
      return;
    }
    try {
      await updateOrderStatus(o.id, status);
      toast.success(`Status atualizado para "${STATUS_LABEL[status]}".`);
      qc.invalidateQueries({ queryKey: ["orders"] });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao atualizar pedido");
    }
  }

  async function confirmExec() {
    if (!execTarget) return;
    const { order, status } = execTarget;
    setExecSubmitting(true);
    try {
      window.open(
        buildWhatsappUrl(order.customer_whatsapp, execMsg),
        "_blank",
        "noopener",
      );
      await updateOrderStatus(order.id, status, { notified: true });
      toast.success(`Pedido movido para "${STATUS_LABEL[status]}". WhatsApp aberto.`);
      qc.invalidateQueries({ queryKey: ["orders"] });
      setExecTarget(null);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao atualizar pedido");
    } finally {
      setExecSubmitting(false);
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

  function onDragStart(e: React.DragEvent, o: OrderRow) {
    e.dataTransfer.setData("text/plain", JSON.stringify({ id: o.id, from: o.status }));
    e.dataTransfer.effectAllowed = "move";
  }

  async function onDropCol(e: React.DragEvent, status: OrderStatus) {
    e.preventDefault();
    setDragOverCol(null);
    try {
      const raw = e.dataTransfer.getData("text/plain");
      if (!raw) return;
      const { id, from } = JSON.parse(raw) as { id: string; from: OrderStatus };
      if (from === status) return;
      const o = orders.find((x) => x.id === id);
      if (!o) return;
      await changeStatus(o, status);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao mover pedido");
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
          <div className="flex flex-wrap items-center gap-2">
            {view === "list" && (
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
            )}
            <div className="flex gap-1 rounded-lg border border-border bg-card p-1">
              <button
                onClick={() => setView("list")}
                aria-pressed={view === "list"}
                title="Visualização em lista"
                className={`p-1.5 rounded-md transition ${
                  view === "list"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                }`}
              >
                <List className="h-4 w-4" />
              </button>
              <button
                onClick={() => {
                  setView("kanban");
                  setFilter("all");
                }}
                aria-pressed={view === "kanban"}
                title="Visualização em kanban"
                className={`p-1.5 rounded-md transition ${
                  view === "kanban"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                }`}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="text-sm text-muted-foreground">Carregando...</div>
        ) : view === "kanban" ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
            {KANBAN_COLUMNS.map((col) => {
              const items = orders.filter((o) => o.status === col.status);
              const colValue = items.reduce((s, o) => s + Number(o.total), 0);
              const isOver = dragOverCol === col.status;
              return (
                <div
                  key={col.status}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                    if (dragOverCol !== col.status) setDragOverCol(col.status);
                  }}
                  onDragLeave={(e) => {
                    if (e.currentTarget === e.target) setDragOverCol(null);
                  }}
                  onDrop={(e) => onDropCol(e, col.status)}
                  className={`flex flex-col rounded-xl border bg-card/40 border-t-4 ${col.accent} transition ${
                    isOver ? "border-primary/60 bg-primary/5 ring-1 ring-primary/40" : "border-border"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 px-3 py-3 border-b border-border/60">
                    <Badge variant="outline" className={`${STATUS_STYLE[col.status]} truncate`}>
                      {STATUS_LABEL[col.status]}
                    </Badge>
                    <div className="text-right shrink-0">
                      <div className="text-[11px] font-semibold tabular-nums">
                        {items.length} {items.length === 1 ? "pedido" : "pedidos"}
                      </div>
                      <div className="text-[10px] text-muted-foreground tabular-nums">
                        {formatBRL(colValue)}
                      </div>
                    </div>
                  </div>
                  <div className="p-3 space-y-3 min-h-[200px]">
                    {items.length === 0 ? (
                      <div className="text-xs text-muted-foreground/70 text-center py-8">
                        Arraste um pedido aqui
                      </div>
                    ) : (
                      items.map((o) => (
                        <article
                          key={o.id}
                          draggable
                          onDragStart={(e) => onDragStart(e, o)}
                          className="group rounded-lg border border-border bg-card p-3 cursor-grab active:cursor-grabbing hover:border-primary/40 transition"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                              {o.code}
                            </span>
                            <GripVertical className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-muted-foreground" />
                          </div>
                          <h4 className="mt-2 text-sm font-semibold truncate">{o.customer_name}</h4>
                          <p className="text-xs text-muted-foreground truncate">{o.plan_name}</p>
                          <div className="mt-2 flex items-center justify-between">
                            <span className="text-sm font-semibold tabular-nums">{formatBRL(o.total)}</span>
                            <span className="text-[10px] text-muted-foreground">{formatDate(o.created_at)}</span>
                          </div>
                          <div className="mt-2 flex gap-1">
                            <a
                              href={chatUrl(o)}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="flex-1"
                            >
                              <Button size="sm" variant="outline" className="w-full h-7 text-xs">
                                <MessageCircle className="h-3 w-3" /> WhatsApp
                              </Button>
                            </a>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                              onClick={() => handleDelete(o)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </article>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
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

      <Dialog open={!!execTarget} onOpenChange={(o) => !o && !execSubmitting && setExecTarget(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Notificar cliente no WhatsApp</DialogTitle>
            <DialogDescription>
              {execTarget && (
                <>
                  Ao confirmar, o pedido{" "}
                  <span className="font-mono text-foreground">{execTarget.order.code}</span> será movido
                  para <span className="text-foreground">{STATUS_LABEL[execTarget.status]}</span> e o WhatsApp de{" "}
                  <span className="text-foreground">{execTarget.order.customer_name}</span> será aberto
                  com a mensagem abaixo.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Mensagem</label>
            <Textarea
              value={execMsg}
              onChange={(e) => setExecMsg(e.target.value)}
              rows={8}
              className="font-mono text-xs"
            />
            <p className="text-[11px] text-muted-foreground">
              Você pode editar a mensagem antes de enviar.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setExecTarget(null)}
              disabled={execSubmitting}
            >
              Cancelar
            </Button>
            <Button onClick={confirmExec} disabled={execSubmitting || !execMsg.trim()}>
              <MessageCircle className="h-3.5 w-3.5" />
              {execSubmitting ? "Enviando..." : "Confirmar e abrir WhatsApp"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}