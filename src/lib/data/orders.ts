import { supabase } from "@/integrations/supabase/client";

export type OrderStatus =
  | "pendente"
  | "em_negociacao"
  | "em_execucao"
  | "pronto_entrega"
  | "concluido"
  | "cancelado";

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
}

export async function listOrders(status?: OrderStatus | "all"): Promise<OrderRow[]> {
  let q = supabase.from("orders").select("*").order("created_at", { ascending: false });
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

export async function updateOrderStatus(id: string, status: OrderStatus, opts?: { notified?: boolean }) {
  const patch = {
    status,
    status_changed_at: new Date().toISOString(),
    ...(opts?.notified ? { notified_at: new Date().toISOString() } : {}),
  };
  const { error } = await supabase.from("orders").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteOrder(id: string) {
  const { error } = await supabase.from("orders").delete().eq("id", id);
  if (error) throw error;
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