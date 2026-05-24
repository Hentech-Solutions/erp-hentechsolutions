import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Product = Database["public"]["Tables"]["products"]["Row"];
export type ProductCategory = Database["public"]["Tables"]["product_categories"]["Row"];

export type ProductFilters = {
  status?: "active" | "inactive" | "all";
  categoryId?: string | null;
  search?: string;
  sortBy?: "name" | "price" | "margin" | "created_at";
  sortDir?: "asc" | "desc";
  page?: number;
  pageSize?: number;
};

export async function listProducts(f: ProductFilters = {}) {
  const page = f.page ?? 1;
  const pageSize = f.pageSize ?? 50;
  let q = supabase
    .from("products")
    .select("*, product_categories(name)", { count: "exact" })
    .is("deleted_at", null);
  if (f.status && f.status !== "all") q = q.eq("status", f.status);
  if (f.categoryId) q = q.eq("category_id", f.categoryId);
  if (f.search) q = q.ilike("name", `%${f.search}%`);
  q = q.order(f.sortBy ?? "created_at", { ascending: (f.sortDir ?? "desc") === "asc" });
  q = q.range((page - 1) * pageSize, page * pageSize - 1);
  const { data, count, error } = await q;
  if (error) throw error;
  return { data: data ?? [], total: count ?? 0, page, pageSize };
}

export async function listProductCategories() {
  const { data, error } = await supabase.from("product_categories").select("*").order("name");
  if (error) throw error;
  return data ?? [];
}

export async function createProduct(input: Database["public"]["Tables"]["products"]["Insert"]) {
  const { data, error } = await supabase.from("products").insert(input).select().single();
  if (error) throw error;
  return data;
}

export async function updateProduct(id: string, patch: Database["public"]["Tables"]["products"]["Update"]) {
  const { data, error } = await supabase.from("products").update(patch).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function softDeleteProduct(id: string) {
  const { error } = await supabase.from("products").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
}

export async function productSalesCheck(id: string) {
  const { count, error } = await supabase
    .from("sale_items")
    .select("id", { count: "exact", head: true })
    .eq("product_id", id);
  if (error) throw error;
  return { has_sales: (count ?? 0) > 0, sales_count: count ?? 0 };
}
