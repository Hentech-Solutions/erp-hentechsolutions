import { supabase } from "@/integrations/supabase/client";
import { rpc } from "@/lib/data/rpc";

/**
 * Catalogo de planos — fonte de verdade do preco e, sobretudo, do CUSTO.
 *
 * O site manda `plan_id`/`plan_name`/`plan_price` no payload do pedido, mas nao
 * sabe quanto custa produzir. Sem este catalogo, `registerOrderSale` gravava
 * `total_cost = 0` e todo pedido aparecia com margem de 100%.
 */

export type Plan = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  price: number;
  unit_cost: number;
  add_unit_price: number;
  add_unit_cost: number;
  is_active: boolean;
  sort_order: number;
  created_at: string;
};

export type PlanInput = {
  code: string;
  name: string;
  description?: string | null;
  price: number;
  unit_cost: number;
  add_unit_price: number;
  add_unit_cost: number;
  is_active?: boolean;
  sort_order?: number;
};

const SELECT =
  "id, code, name, description, price, unit_cost, add_unit_price, add_unit_cost, is_active, sort_order, created_at";

export async function listPlans(opts: { activeOnly?: boolean } = {}): Promise<Plan[]> {
  let q = supabase
    .from("plans")
    .select(SELECT)
    .is("deleted_at", null)
    .order("sort_order")
    .order("name");
  if (opts.activeOnly) q = q.eq("is_active", true);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as unknown as Plan[];
}

export async function createPlan(input: PlanInput): Promise<Plan> {
  const { data, error } = await supabase.from("plans").insert(input).select(SELECT).single();
  if (error) throw error;
  return data as unknown as Plan;
}

export async function updatePlan(id: string, patch: Partial<PlanInput>): Promise<Plan> {
  const { data, error } = await supabase
    .from("plans")
    .update(patch)
    .eq("id", id)
    .select(SELECT)
    .single();
  if (error) throw error;
  return data as unknown as Plan;
}

export async function softDeletePlan(id: string) {
  const { error } = await supabase
    .from("plans")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

/** Margem unitaria do plano base, em %. */
export function planMargin(p: Pick<Plan, "price" | "unit_cost">): number {
  if (p.price <= 0) return 0;
  return ((p.price - p.unit_cost) / p.price) * 100;
}

/** Margem do cartao adicional, em %. */
export function addMargin(p: Pick<Plan, "add_unit_price" | "add_unit_cost">): number {
  if (p.add_unit_price <= 0) return 0;
  return ((p.add_unit_price - p.add_unit_cost) / p.add_unit_price) * 100;
}

export type PriceMismatch = {
  order_id: string;
  code: string;
  plan_name: string;
  site_price: number;
  catalog_price: number;
  diff: number;
  ordered_at: string;
};

/** Pedidos em que o preco enviado pelo site diverge do catalogo do ERP. */
export async function getPriceMismatches(): Promise<PriceMismatch[]> {
  const rows = await rpc<PriceMismatch[]>("get_plan_price_mismatches");
  return (rows ?? []).map((r) => ({
    ...r,
    site_price: Number(r.site_price),
    catalog_price: Number(r.catalog_price),
    diff: Number(r.diff),
  }));
}
