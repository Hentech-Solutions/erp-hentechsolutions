import { supabase } from "@/integrations/supabase/client";
import { rpc } from "@/lib/data/rpc";
import { notifySaleCompleted } from "@/lib/telegram.functions";

export type OrderStatus =
  "pendente" | "em_negociacao" | "em_execucao" | "pronto_entrega" | "concluido" | "cancelado";

/**
 * De onde o pedido veio.
 *  - `site`: fechado com plano e valor (checkout da uicard, por exemplo)
 *  - `lead`: formulario da landing page — nasce sem plano e sem valor, que sao
 *    definidos aqui dentro depois do atendimento por WhatsApp
 *  - `manual`: lancado a mao no ERP
 */
export type OrderOrigin = "site" | "lead" | "manual";

export const ORIGIN_LABEL: Record<OrderOrigin, string> = {
  site: "Pedido do site",
  lead: "Lead do site",
  manual: "Lançado manualmente",
};

export interface OrderRow {
  id: string;
  code: string;
  order_created_at: string;
  customer_name: string;
  customer_whatsapp: string;
  customer_email: string;
  customer_company: string | null;
  customer_role: string | null;
  /** null em lead: plano e valor sao definidos no atendimento, nao no formulario. */
  plan_id: string | null;
  plan_name: string | null;
  plan_price: number | null;
  add_quantity: number;
  add_unit_price: number;
  add_subtotal: number;
  add_discount_applied: boolean;
  add_saving: number;
  total: number | null;
  currency: string;
  origin: OrderOrigin;
  notes: string | null;
  status: OrderStatus;
  status_changed_at: string | null;
  notified_at: string | null;
  created_at: string;
  updated_at: string;
  // pagamento: dimensao independente do kanban de execucao
  payment_status: "aguardando" | "parcial" | "pago";
  paid_amount: number;
  paid_at: string | null;
  payment_method: string | null;
  due_date: string | null;
  plan_ref_id: string | null;
}

export async function listOrders(status?: OrderStatus | "all"): Promise<OrderRow[]> {
  let q = supabase
    .from("orders")
    .select("*")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (status && status !== "all") q = q.eq("status", status);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as unknown as OrderRow[];
}

export interface OrdersStats {
  total: number;
  totalValue: number;
  ticket: number;
  byStatus: { status: OrderStatus; count: number; value: number }[];
  conversion: number;
}

export const ORDER_STATUSES: OrderStatus[] = [
  "pendente",
  "em_negociacao",
  "em_execucao",
  "pronto_entrega",
  "concluido",
  "cancelado",
];

export async function getOrdersStats(): Promise<OrdersStats> {
  const rows = await listOrders("all");
  const total = rows.length;
  const sumTotal = (list: OrderRow[]) => list.reduce((s, r) => s + Number(r.total ?? 0), 0);
  const totalValue = sumTotal(rows);
  const byStatus = ORDER_STATUSES.map((status) => {
    const items = rows.filter((r) => r.status === status);
    return { status, count: items.length, value: sumTotal(items) };
  });
  const done = byStatus.find((b) => b.status === "concluido")?.count ?? 0;
  // Ticket medio sobre pedidos precificados: incluir lead ainda sem valor no
  // divisor derrubaria o ticket a cada contato novo que chega pela LP.
  const priced = rows.filter((r) => r.total !== null);
  return {
    total,
    totalValue,
    ticket: priced.length > 0 ? sumTotal(priced) / priced.length : 0,
    byStatus,
    conversion: total > 0 ? (done / total) * 100 : 0,
  };
}

export async function updateOrderStatus(
  id: string,
  status: OrderStatus,
  opts?: { notified?: boolean },
) {
  const patch = {
    status,
    status_changed_at: new Date().toISOString(),
    ...(opts?.notified ? { notified_at: new Date().toISOString() } : {}),
  };
  const { error } = await supabase.from("orders").update(patch).eq("id", id);
  if (error) throw error;
}

export interface OrderQuoteInput {
  /** uuid do plano do catálogo, quando o orçamento saiu de um plano cadastrado. */
  planRefId: string | null;
  /** `code` do plano — é por ele que `resolve_order_plan` acha o custo real. */
  planId: string | null;
  planName: string;
  planPrice: number;
  addQuantity: number;
  addUnitPrice: number;
}

/**
 * Define ou corrige o orçamento de um pedido.
 *
 * Existe para o fluxo do lead: ele entra pela landing page sem plano e sem
 * valor, e o preço só nasce depois do atendimento por WhatsApp. Serve também
 * para corrigir um pedido do site cujo valor foi combinado diferente.
 *
 * `total` é derivado aqui, nunca digitado: com o valor total solto, dava para
 * salvar um pedido em que `plan_price + adicionais` não fecha com `total`, e o
 * detalhe do pedido exibe as três coisas lado a lado.
 */
export async function updateOrderQuote(id: string, input: OrderQuoteInput) {
  const planName = input.planName.trim();
  if (!planName) throw new Error("Informe a descrição do serviço.");
  const addSubtotal = input.addQuantity * input.addUnitPrice;
  const { error } = await supabase
    .from("orders")
    .update({
      plan_ref_id: input.planRefId,
      // Pedidos site/manual precisam de plan_id não nulo pela constraint. Para
      // orçamento avulso, persiste um identificador textual estável e não
      // confunde o serviço personalizado com um plano do catálogo.
      plan_id: input.planId ?? `custom:${planName}`,
      plan_name: planName,
      plan_price: input.planPrice,
      add_quantity: input.addQuantity,
      add_unit_price: input.addUnitPrice,
      add_subtotal: addSubtotal,
      total: input.planPrice + addSubtotal,
    })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteOrder(id: string) {
  // Soft delete: um pedido apagado de vez levava junto a rastreabilidade da
  // receita que ele gerou (external_ref "order:<id>" apontando para o nada).
  const { error } = await supabase
    .from("orders")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export type RegisterSaleResult = {
  status: "created" | "skipped";
  total_cost?: number;
  settled?: boolean;
  /** false = nenhum plano do catalogo bateu, entao o custo entrou como zero. */
  plan_matched?: boolean;
};

/**
 * Registra o pedido concluido como venda + receita no financeiro.
 *
 * Roda inteiro dentro de uma RPC transacional (`register_order_sale`), que:
 *  - resolve o custo real pelo catalogo de planos (antes era `total_cost: 0`,
 *    e todo pedido saia com margem de 100%)
 *  - grava sale_items, para o CMV chegar no DRE
 *  - so marca a receita como liquidada se o pagamento ja foi confirmado; antes
 *    assumia que pedido concluido = pedido pago, e o PIX e manual
 *  - vincula/cria o cliente no CRM
 * Idempotente por `external_ref = order:<id>`.
 */
export async function registerOrderSale(order: OrderRow): Promise<RegisterSaleResult> {
  const res = await rpc<RegisterSaleResult>("register_order_sale", { _order_id: order.id });
  if (res.status === "created") {
    try {
      await notifySaleCompleted({ data: { amount: Number(order.total ?? 0) } });
    } catch (e) {
      console.error("Telegram notification failed:", (e as Error).message);
    }
  }
  return res;
}

export type PaymentStatus = "aguardando" | "parcial" | "pago";

export const PAYMENT_LABEL: Record<PaymentStatus, string> = {
  aguardando: "Aguardando pagamento",
  parcial: "Pago parcialmente",
  pago: "Pago",
};

/**
 * Baixa de pagamento do pedido.
 *
 * Espelha no lancamento financeiro correspondente, e o caminho inverso tambem
 * vale: dar baixa em Contas a Receber marca o pedido como pago (trigger
 * `trg_sync_order_payment`).
 */
export async function setOrderPayment(input: {
  orderId: string;
  status: PaymentStatus;
  amount?: number;
  method?: string;
  paidAt?: string;
}): Promise<{ status: PaymentStatus; paid_amount: number }> {
  return rpc("set_order_payment", {
    _order_id: input.orderId,
    _status: input.status,
    _amount: input.amount ?? null,
    _method: input.method ?? null,
    _paid_at: input.paidAt ?? null,
  });
}

/** Sanitize a Brazilian phone number to international E.164 digits for wa.me */
export function whatsappDigits(input: string): string {
  const digits = input.replace(/\D+/g, "");
  if (!digits) return "";
  // assume Brazil if 10 or 11 digits and no country code
  if (digits.length <= 11) return `55${digits}`;
  return digits;
}

export function buildWhatsappUrl(phone: string, message: string): string {
  const d = whatsappDigits(phone);
  return `https://wa.me/${d}?text=${encodeURIComponent(message)}`;
}

export const STATUS_LABEL: Record<OrderStatus, string> = {
  pendente: "Entrada",
  em_negociacao: "Em negociação",
  em_execucao: "Em execução",
  pronto_entrega: "Pronto para entrega",
  concluido: "Concluído",
  cancelado: "Cancelado",
};
