import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { generateRecurrenceDates } from "@/lib/recurrence";
import { rpc } from "@/lib/data/rpc";

type EntryType = Database["public"]["Enums"]["financial_entry_type"];
type Recurrence = Database["public"]["Enums"]["expense_recurrence"];
export type FinancialEntry = Database["public"]["Tables"]["financial_entries"]["Row"];
export type FinancialCategory = Database["public"]["Tables"]["financial_categories"]["Row"];

/**
 * Categorias de sistema sao resolvidas por slug, nao por UUID cravado no
 * codigo. O UUID anterior ("744eb29b-...") so funcionava neste banco: numa base
 * nova, ou depois de um reseed, o insert quebrava com violacao de FK.
 */
export type CategorySlug =
  | "venda_produto"
  | "servico_prestado"
  | "outras_receitas"
  | "custo_operacional"
  | "folha_pagamento"
  | "marketing"
  | "infraestrutura"
  | "outras_despesas"
  | "aporte_socio"
  | "financiamento"
  | "investimento_ativo"
  | "retirada_socio";

const slugCache = new Map<CategorySlug, string>();

export async function getCategoryIdBySlug(slug: CategorySlug): Promise<string> {
  const cached = slugCache.get(slug);
  if (cached) return cached;
  const { data, error } = await supabase
    .from("financial_categories")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  if (!data?.id) throw new Error(`Categoria de sistema "${slug}" não encontrada`);
  slugCache.set(slug, data.id);
  return data.id;
}

/** Id da categoria "Venda de Produto", resolvido em runtime. */
export const getVendaProdutoCategoryId = () => getCategoryIdBySlug("venda_produto");

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
  q = q
    .order("reference_date", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);
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
  /** Vencimento. Default = reference_date. */
  due_date?: string | null;
  description?: string | null;
  payment_date?: string | null;
  recurrence: Recurrence;
  cash_flow_cat?: Database["public"]["Enums"]["cash_flow_category"];
  recurrence_count?: number;
  product_id?: string | null;
  notes?: string | null;
  items?: SaleItemInput[];
  discount?: number;
  customer_id?: string | null;
};

export async function createEntry(input: CreateEntryInput) {
  // Venda com itens: uma unica RPC transacional. Antes eram tres inserts
  // sequenciais disparados do browser (sales -> sale_items -> financial_entries)
  // e uma falha no meio deixava venda orfa, sem lancamento financeiro.
  if (input.items && input.items.length > 0) {
    const [row] = await rpc<Array<{ sale_id: string; entry_id: string }>>(
      "create_sale_with_entry",
      {
        _reference_date: input.reference_date,
        _category_id: input.category_id,
        _items: input.items,
        _discount: input.discount ?? 0,
        _description: input.description ?? null,
        _notes: input.notes ?? null,
        _customer_id: input.customer_id ?? null,
        _due_date: input.due_date ?? input.reference_date,
        _is_settled: Boolean(input.payment_date),
      },
    );
    const { data, error } = await supabase
      .from("financial_entries")
      .select()
      .eq("id", row.entry_id);
    if (error) throw error;
    return data ?? [];
  }

  const dates = generateRecurrenceDates(
    input.reference_date,
    input.recurrence,
    input.recurrence_count ?? 12,
  );
  const dueDates = generateRecurrenceDates(
    input.due_date ?? input.reference_date,
    input.recurrence,
    input.recurrence_count ?? 12,
  );
  const groupId = input.recurrence === "one_time" ? null : crypto.randomUUID();
  const rows = dates.map((d, i) => ({
    type: input.type,
    amount: input.amount,
    category_id: input.category_id,
    reference_date: d,
    due_date: dueDates[i] ?? d,
    description: input.description ?? null,
    payment_date: i === 0 ? (input.payment_date ?? null) : null,
    recurrence: input.recurrence,
    recurrence_group_id: groupId,
    cash_flow_cat: input.cash_flow_cat ?? "operational",
    product_id: input.product_id ?? null,
    notes: input.notes ?? null,
    // so a primeira parcela pode ja nascer liquidada
    is_settled: i === 0 ? Boolean(input.payment_date) : false,
    customer_id: input.customer_id ?? null,
  }));
  const { data, error } = await supabase.from("financial_entries").insert(rows).select();
  if (error) throw error;
  return data ?? [];
}

export async function updateEntry(
  id: string,
  patch: Database["public"]["Tables"]["financial_entries"]["Update"],
) {
  const { data, error } = await supabase
    .from("financial_entries")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
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
  const { error } = await supabase
    .from("financial_entries")
    .update({ deleted_at: null })
    .eq("id", id);
  if (error) throw error;
}

export type Dre = {
  revenue: number;
  discounts: number;
  cogs: number;
  grossProfit: number;
  operatingExpenses: number;
  expensesByCategory: Array<{ name: string; color: string; amount: number }>;
  operatingProfit: number;
  netProfit: number;
  grossMargin: number;
  operatingMargin: number;
  netMargin: number;
};

/**
 * DRE com CMV real.
 *
 * A versao anterior fazia `grossProfit = revenue`, ou seja, ignorava o custo dos
 * produtos vendidos e reportava margem bruta de 100% sempre -- mesmo com
 * sale_items.unit_cost preenchido. Agora o CMV vem de sale_items das vendas
 * vivas no periodo.
 */
export async function getProfitBreakdown(from: string, to: string): Promise<Dre> {
  const d = await rpc<{
    revenue: number;
    discounts: number;
    cogs: number;
    gross_profit: number;
    operating_expenses: number;
    expenses_by_category: Array<{ name: string; color: string; amount: number }>;
    operating_profit: number;
    net_profit: number;
    gross_margin: number;
    operating_margin: number;
    net_margin: number;
  }>("get_dre", { _from: from, _to: to });

  return {
    revenue: Number(d.revenue),
    discounts: Number(d.discounts),
    cogs: Number(d.cogs),
    grossProfit: Number(d.gross_profit),
    operatingExpenses: Number(d.operating_expenses),
    expensesByCategory: (d.expenses_by_category ?? []).map((c) => ({
      name: c.name,
      color: c.color,
      amount: Number(c.amount),
    })),
    operatingProfit: Number(d.operating_profit),
    netProfit: Number(d.net_profit),
    grossMargin: Number(d.gross_margin),
    operatingMargin: Number(d.operating_margin),
    netMargin: Number(d.net_margin),
  };
}
