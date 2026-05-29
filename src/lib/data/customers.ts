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
  const { count: salesCount, error } = await supabase
    .from("sales")
    .select("id", { count: "exact", head: true })
    .eq("customer_id", id);
  if (error) throw error;
  const { count: entriesCount, error: e2 } = await supabase
    .from("financial_entries")
    .select("id", { count: "exact", head: true })
    .eq("customer_id", id)
    .is("deleted_at", null);
  if (e2) throw e2;
  return (salesCount ?? 0) + (entriesCount ?? 0);
}

export type CustomerMetrics = {
  total_spent: number;
  avg_ticket: number;
  sales_count: number;
  last_purchase: string | null;
};

export async function getCustomerMetrics(id: string): Promise<CustomerMetrics> {
  const rows = await getCustomerSales(id);
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
  const { data: sales, error } = await supabase
    .from("sales")
    .select("id, sale_date, total_amount, total_cost, discount, notes")
    .eq("customer_id", id)
    .order("sale_date", { ascending: false });
  if (error) throw error;
  const { data: entries, error: e2 } = await supabase
    .from("financial_entries")
    .select("id, reference_date, amount, description, sale_id")
    .eq("customer_id", id)
    .eq("type", "revenue")
    .is("deleted_at", null)
    .order("reference_date", { ascending: false });
  if (e2) throw e2;
  // Exclude financial_entries already linked to a sale to avoid double counting
  const serviceRows = (entries ?? [])
    .filter((e) => !e.sale_id)
    .map((e) => ({
      id: e.id,
      sale_date: e.reference_date,
      total_amount: Number(e.amount),
      total_cost: 0,
      discount: 0,
      notes: e.description ?? "Prestação de serviço",
    }));
  const all = [...(sales ?? []), ...serviceRows].sort((a, b) =>
    a.sale_date < b.sale_date ? 1 : -1,
  );
  return all;
}

/** Aggregate metrics for a list of customer ids in one round-trip. */
export async function getCustomersMetricsMap(
  ids: string[],
): Promise<Record<string, { total_spent: number; last_purchase: string | null; sales_count: number }>> {
  if (ids.length === 0) return {};
  const { data: sales, error } = await supabase
    .from("sales")
    .select("customer_id, total_amount, sale_date")
    .in("customer_id", ids);
  if (error) throw error;
  const { data: entries, error: e2 } = await supabase
    .from("financial_entries")
    .select("customer_id, amount, reference_date, sale_id")
    .in("customer_id", ids)
    .eq("type", "revenue")
    .is("deleted_at", null);
  if (e2) throw e2;
  const map: Record<string, { total_spent: number; last_purchase: string | null; sales_count: number }> = {};
  const bump = (cid: string | null, amount: number, date: string | null) => {
    if (!cid) return;
    if (!map[cid]) map[cid] = { total_spent: 0, last_purchase: null, sales_count: 0 };
    map[cid].total_spent += amount;
    map[cid].sales_count += 1;
    if (date && (!map[cid].last_purchase || date > map[cid].last_purchase!)) {
      map[cid].last_purchase = date;
    }
  };
  for (const r of sales ?? []) {
    bump(r.customer_id as string | null, Number(r.total_amount ?? 0), r.sale_date);
  }
  for (const r of entries ?? []) {
    if (r.sale_id) continue; // already counted via sales
    bump(r.customer_id as string | null, Number(r.amount ?? 0), r.reference_date);
  }
  return map;
}

/** Top customers by revenue (sales + service revenue). */
export async function getTopCustomersByRevenue(limit = 10) {
  const { data: customers, error } = await supabase
    .from("customers")
    .select("id, name, person_type")
    .is("deleted_at", null);
  if (error) throw error;
  const ids = (customers ?? []).map((c) => c.id);
  const m = await getCustomersMetricsMap(ids);
  return (customers ?? [])
    .map((c) => ({
      id: c.id,
      name: c.name,
      person_type: c.person_type,
      total_spent: m[c.id]?.total_spent ?? 0,
      sales_count: m[c.id]?.sales_count ?? 0,
      last_purchase: m[c.id]?.last_purchase ?? null,
    }))
    .filter((c) => c.total_spent > 0)
    .sort((a, b) => b.total_spent - a.total_spent)
    .slice(0, limit);
}

/** Stub kept for backward compatibility — original loop removed above. */
function __unused_legacy_metrics_loop() {
  const map: Record<string, { total_spent: number; last_purchase: string | null; sales_count: number }> = {};
  for (const r of [] as Array<{ customer_id: string | null; total_amount: number | null; sale_date: string | null }>) {
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