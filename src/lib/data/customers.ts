import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Customer = Database["public"]["Tables"]["customers"]["Row"];
export type CustomerInsert = Database["public"]["Tables"]["customers"]["Insert"];
export type CustomerUpdate = Database["public"]["Tables"]["customers"]["Update"];

export type CustomerFilters = {
  search?: string;
  personType?: "all" | "individual" | "company";
  page?: number;
  pageSize?: number;
};

export async function listCustomers(f: CustomerFilters = {}) {
  const page = f.page ?? 1;
  const pageSize = f.pageSize ?? 50;
  let q = supabase
    .from("customers")
    .select("*", { count: "exact" })
    .is("deleted_at", null);
  if (f.personType && f.personType !== "all") q = q.eq("person_type", f.personType);
  if (f.search) {
    const digits = f.search.replace(/\D+/g, "");
    const ors = [`name.ilike.%${f.search}%`];
    if (digits.length > 0) ors.push(`document.ilike.%${digits}%`);
    q = q.or(ors.join(","));
  }
  q = q.order("created_at", { ascending: false });
  q = q.range((page - 1) * pageSize, page * pageSize - 1);
  const { data, count, error } = await q;
  if (error) throw error;
  return { data: data ?? [], total: count ?? 0, page, pageSize };
}

export async function getCustomer(id: string) {
  const { data, error } = await supabase.from("customers").select("*").eq("id", id).single();
  if (error) throw error;
  return data;
}

export async function createCustomer(input: CustomerInsert) {
  const { data, error } = await supabase.from("customers").insert(input).select().single();
  if (error) throw error;
  return data;
}

export async function updateCustomer(id: string, patch: CustomerUpdate) {
  const { data, error } = await supabase.from("customers").update(patch).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function softDeleteCustomer(id: string) {
  const { error } = await supabase
    .from("customers")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function customerSalesCount(id: string) {
  const { count, error } = await supabase
    .from("sales")
    .select("id", { count: "exact", head: true })
    .eq("customer_id", id);
  if (error) throw error;
  return count ?? 0;
}

export type CustomerMetrics = {
  total_spent: number;
  avg_ticket: number;
  sales_count: number;
  last_purchase: string | null;
};

export async function getCustomerMetrics(id: string): Promise<CustomerMetrics> {
  const { data, error } = await supabase
    .from("sales")
    .select("total_amount, sale_date")
    .eq("customer_id", id)
    .order("sale_date", { ascending: false });
  if (error) throw error;
  const rows = data ?? [];
  const total = rows.reduce((s, r) => s + Number(r.total_amount ?? 0), 0);
  const count = rows.length;
  return {
    total_spent: total,
    avg_ticket: count > 0 ? total / count : 0,
    sales_count: count,
    last_purchase: rows[0]?.sale_date ?? null,
  };
}

export async function getCustomerSales(id: string) {
  const { data, error } = await supabase
    .from("sales")
    .select("id, sale_date, total_amount, total_cost, discount, notes")
    .eq("customer_id", id)
    .order("sale_date", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/** Aggregate metrics for a list of customer ids in one round-trip. */
export async function getCustomersMetricsMap(
  ids: string[],
): Promise<Record<string, { total_spent: number; last_purchase: string | null; sales_count: number }>> {
  if (ids.length === 0) return {};
  const { data, error } = await supabase
    .from("sales")
    .select("customer_id, total_amount, sale_date")
    .in("customer_id", ids);
  if (error) throw error;
  const map: Record<string, { total_spent: number; last_purchase: string | null; sales_count: number }> = {};
  for (const r of data ?? []) {
    const cid = r.customer_id as string | null;
    if (!cid) continue;
    if (!map[cid]) map[cid] = { total_spent: 0, last_purchase: null, sales_count: 0 };
    map[cid].total_spent += Number(r.total_amount ?? 0);
    map[cid].sales_count += 1;
    if (!map[cid].last_purchase || (r.sale_date && r.sale_date > map[cid].last_purchase!)) {
      map[cid].last_purchase = r.sale_date;
    }
  }
  return map;
}