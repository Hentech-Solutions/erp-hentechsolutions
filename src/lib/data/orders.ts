import { supabase } from "@/integrations/supabase/client";
import { rpc } from "@/lib/data/rpc";
import { notifySaleCompleted } from "@/lib/telegram.functions";

export type OrderStatus =
  "pendente" | "em_negociacao" | "em_execucao" | "pronto_entrega" | "concluido" | "cancelado";

export interface OrderRow {
  id: string;
  code: string;
  order_created_at: string;
  customer_name: string;
  customer_whatsapp: string;
  customer_email: string;
  customer_company: string | null;
  customer_role: string | null;
  plan_id: string;
  plan_name: string;
  plan_price: number;
  add_quantity: number;
  add_unit_price: number;
  add_subtotal: number;
  add_discount_applied: boolean;
  add_saving: number;
  total: number;
  currency: string;
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
  const totalValue = rows.reduce((s, r) => s + Number(r.total), 0);
  const byStatus = ORDER_STATUSES.map((status) => {
    const items = rows.filter((r) => r.status === status);
    return {
      status,
      count: items.length,
      value: items.reduce((s, r) => s + Number(r.total), 0),
    };
  });
  const done = byStatus.find((b) => b.status === "concluido")?.count ?? 0;
  return {
    total,
    totalValue,
    ticket: total > 0 ? totalValue / total : 0,
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
      await notifySaleCompleted({ data: { amount: Number(order.total) } });
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
