import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { generateRecurrenceDates } from "@/lib/recurrence";

type EntryType = Database["public"]["Enums"]["financial_entry_type"];
type Recurrence = Database["public"]["Enums"]["expense_recurrence"];
export type FinancialEntry = Database["public"]["Tables"]["financial_entries"]["Row"];
export type FinancialCategory = Database["public"]["Tables"]["financial_categories"]["Row"];

export const VENDA_DE_PRODUTO_CATEGORY_ID = "744eb29b-a0bd-4d26-90eb-ddc245ee5ea8";

export type SaleItemInput = {
  product_id: string;
  quantity: number;
  unit_price: number;
  unit_cost: number;
  name: string;
};

export type EntryFilters = {
  type?: EntryType | "all";
  categoryId?: string | null;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
};

export async function listEntries(f: EntryFilters = {}) {
  const page = f.page ?? 1;
  const pageSize = f.pageSize ?? 100;
  let q = supabase
    .from("financial_entries")
    .select("*, financial_categories(name, color, type)", { count: "exact" })
    .is("deleted_at", null);
  if (f.type && f.type !== "all") q = q.eq("type", f.type);
  if (f.categoryId) q = q.eq("category_id", f.categoryId);
  if (f.from) q = q.gte("reference_date", f.from);
  if (f.to) q = q.lte("reference_date", f.to);
  q = q.order("reference_date", { ascending: false }).range((page - 1) * pageSize, page * pageSize - 1);
  const { data, count, error } = await q;
  if (error) throw error;
  return { data: data ?? [], total: count ?? 0, page, pageSize };
}

export async function listFinancialCategories(type?: EntryType) {
  let q = supabase.from("financial_categories").select("*").order("name");
  if (type) q = q.eq("type", type);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export type CreateEntryInput = {
  type: EntryType;
  amount: number;
  category_id: string;
  reference_date: string;
  description?: string | null;
  payment_date?: string | null;
  recurrence: Recurrence;
  cash_flow_cat?: Database["public"]["Enums"]["cash_flow_category"];
  recurrence_count?: number;
  product_id?: string | null;
  notes?: string | null;
  items?: SaleItemInput[];
  discount?: number;
};

export async function createEntry(input: CreateEntryInput) {
  let saleId: string | null = null;
  let computedAmount = input.amount;

  if (input.items && input.items.length > 0) {
    const totalAmount = input.items.reduce((s, it) => s + it.quantity * it.unit_price, 0);
    const totalCost = input.items.reduce((s, it) => s + it.quantity * it.unit_cost, 0);
    const discount = Math.max(0, Math.min(Number(input.discount ?? 0), totalAmount));
    computedAmount = totalAmount - discount;
    const { data: sale, error: saleErr } = await supabase
      .from("sales")
      .insert({
        sale_date: input.reference_date,
        total_amount: totalAmount,
        total_cost: totalCost,
        discount,
        notes: input.description ?? null,
      })
      .select()
      .single();
    if (saleErr) throw saleErr;
    saleId = sale.id;
    const itemRows = input.items.map((it) => ({
      sale_id: sale.id,
      product_id: it.product_id,
      quantity: it.quantity,
      unit_price: it.unit_price,
      unit_cost: it.unit_cost,
      discount: 0,
      subtotal: it.quantity * it.unit_price,
      product_snapshot: { name: it.name, price: it.unit_price, cost: it.unit_cost },
    }));
    const { error: itemsErr } = await supabase.from("sale_items").insert(itemRows);
    if (itemsErr) throw itemsErr;
  }

  const dates = generateRecurrenceDates(input.reference_date, input.recurrence, input.recurrence_count ?? 12);
  const groupId = input.recurrence === "one_time" ? null : crypto.randomUUID();
  const rows = dates.map((d, i) => ({
    type: input.type,
    amount: computedAmount,
    category_id: input.category_id,
    reference_date: d,
    description: input.description ?? null,
    payment_date: i === 0 ? input.payment_date ?? null : null,
    recurrence: input.recurrence,
    recurrence_group_id: groupId,
    cash_flow_cat: input.cash_flow_cat ?? "operational",
    product_id: input.product_id ?? null,
    sale_id: i === 0 ? saleId : null,
    notes: input.notes ?? null,
    is_settled: false,
  }));
  const { data, error } = await supabase.from("financial_entries").insert(rows).select();
  if (error) throw error;
  return data ?? [];
}

export async function updateEntry(id: string, patch: Database["public"]["Tables"]["financial_entries"]["Update"]) {
  const { data, error } = await supabase.from("financial_entries").update(patch).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function softDeleteEntry(id: string) {
  const { error } = await supabase
    .from("financial_entries")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function restoreEntry(id: string) {
  const { error } = await supabase.from("financial_entries").update({ deleted_at: null }).eq("id", id);
  if (error) throw error;
}

export async function getProfitBreakdown(from: string, to: string) {
  const { data, error } = await supabase
    .from("financial_entries")
    .select("type, amount")
    .is("deleted_at", null)
    .gte("reference_date", from)
    .lte("reference_date", to);
  if (error) throw error;
  let revenue = 0;
  let expense = 0;
  for (const r of data ?? []) {
    const a = Number(r.amount);
    if (r.type === "revenue") revenue += a;
    if (r.type === "expense") expense += a;
  }
  const grossProfit = revenue;
  const operationalProfit = revenue - expense;
  const netProfit = operationalProfit;
  return {
    revenue,
    expense,
    grossProfit,
    operationalProfit,
    netProfit,
    grossMargin: revenue > 0 ? (grossProfit / revenue) * 100 : 0,
    operationalMargin: revenue > 0 ? (operationalProfit / revenue) * 100 : 0,
    netMargin: revenue > 0 ? (netProfit / revenue) * 100 : 0,
  };
}
