import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { rpc } from "@/lib/data/rpc";

/**
 * Contas a Pagar e a Receber.
 *
 * `is_settled`, `payment_date` e o indice `idx_fe_settled` existiam desde a
 * primeira migration e nunca foram lidos por nenhuma tela. A base tem
 * R$ 1.589.944 em aberto que o sistema nao mostrava em lugar nenhum.
 */

export type Direction = "receivable" | "payable";

export const BUCKETS = [
  "overdue_60",
  "overdue_31_60",
  "overdue_1_30",
  "due_today",
  "due_1_30",
  "due_31_60",
  "due_60",
] as const;
export type Bucket = (typeof BUCKETS)[number];

export const BUCKET_LABEL: Record<Bucket, string> = {
  overdue_60: "Vencido +60d",
  overdue_31_60: "Vencido 31-60d",
  overdue_1_30: "Vencido 1-30d",
  due_today: "Vence hoje",
  due_1_30: "Vence em 30d",
  due_31_60: "Vence em 31-60d",
  due_60: "Vence +60d",
};

export const isOverdue = (b: Bucket) => b.startsWith("overdue");

type SummaryRow = {
  direction: Direction;
  bucket: Bucket;
  bucket_order: number;
  entry_count: number;
  total: number;
};

export type Totals = { count: number; total: number };
export type DirectionSummary = {
  buckets: Array<{ bucket: Bucket; label: string; count: number; total: number }>;
  overdue: Totals;
  dueSoon: Totals;
  all: Totals;
};
export type ApArSummary = { receivable: DirectionSummary; payable: DirectionSummary };

const emptyDirection = (): DirectionSummary => ({
  buckets: [],
  overdue: { count: 0, total: 0 },
  dueSoon: { count: 0, total: 0 },
  all: { count: 0, total: 0 },
});

export async function getApArSummary(asOf?: string): Promise<ApArSummary> {
  const rows = await rpc<SummaryRow[]>("get_ap_ar_summary", {
    _as_of: asOf ?? new Date().toISOString().slice(0, 10),
  });

  const out: ApArSummary = { receivable: emptyDirection(), payable: emptyDirection() };

  for (const r of rows ?? []) {
    const side = out[r.direction];
    if (!side) continue;
    const count = Number(r.entry_count);
    const total = Number(r.total);

    side.buckets.push({ bucket: r.bucket, label: BUCKET_LABEL[r.bucket], count, total });
    side.all.count += count;
    side.all.total += total;

    if (isOverdue(r.bucket)) {
      side.overdue.count += count;
      side.overdue.total += total;
    } else if (r.bucket === "due_today" || r.bucket === "due_1_30") {
      side.dueSoon.count += count;
      side.dueSoon.total += total;
    }
  }

  for (const side of [out.receivable, out.payable]) {
    side.buckets.sort((a, b) => BUCKETS.indexOf(a.bucket) - BUCKETS.indexOf(b.bucket));
  }
  return out;
}

type EntryType = Database["public"]["Enums"]["financial_entry_type"];

const RECEIVABLE_TYPES: EntryType[] = ["revenue", "capital_in"];
const PAYABLE_TYPES: EntryType[] = ["expense", "withdrawal"];

export type OpenEntry = {
  id: string;
  type: string;
  amount: number;
  description: string | null;
  reference_date: string;
  due_date: string;
  is_settled: boolean;
  recurrence_group_id: string | null;
  financial_categories: { name: string; color: string | null } | null;
  customers: { name: string } | null;
};

export type OpenEntryFilters = {
  direction: Direction;
  status?: "open" | "overdue" | "settled";
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
};

export async function listOpenEntries(f: OpenEntryFilters) {
  const page = f.page ?? 1;
  const pageSize = f.pageSize ?? 50;
  const today = new Date().toISOString().slice(0, 10);
  const types = f.direction === "receivable" ? RECEIVABLE_TYPES : PAYABLE_TYPES;

  let q = supabase
    .from("financial_entries")
    .select(
      "id, type, amount, description, reference_date, due_date, is_settled, recurrence_group_id, financial_categories(name, color), customers(name)",
      { count: "exact" },
    )
    .is("deleted_at", null)
    .in("type", types);

  if (f.status === "settled") {
    q = q.eq("is_settled", true);
  } else {
    q = q.eq("is_settled", false);
    if (f.status === "overdue") q = q.lt("due_date", today);
  }
  if (f.from) q = q.gte("due_date", f.from);
  if (f.to) q = q.lte("due_date", f.to);

  q = q.order("due_date", { ascending: true }).range((page - 1) * pageSize, page * pageSize - 1);

  const { data, count, error } = await q;
  if (error) throw error;
  return {
    data: (data ?? []) as unknown as OpenEntry[],
    total: count ?? 0,
    page,
    pageSize,
  };
}

/** Liquida em lote. Retorna quantos lancamentos mudaram de estado. */
export async function settleEntries(ids: string[], paymentDate?: string): Promise<number> {
  if (ids.length === 0) return 0;
  return Number(
    await rpc<number>("settle_entries", {
      _ids: ids,
      _payment_date: paymentDate ?? new Date().toISOString().slice(0, 10),
    }),
  );
}

export async function unsettleEntries(ids: string[]): Promise<number> {
  if (ids.length === 0) return 0;
  return Number(await rpc<number>("unsettle_entries", { _ids: ids }));
}

/** Edita todas as parcelas em aberto de uma serie a partir de uma competencia. */
export async function updateRecurrenceSeries(input: {
  groupId: string;
  from: string;
  amount?: number;
  categoryId?: string;
  description?: string;
}): Promise<number> {
  return Number(
    await rpc<number>("update_recurrence_series", {
      _group_id: input.groupId,
      _from: input.from,
      _amount: input.amount ?? null,
      _category_id: input.categoryId ?? null,
      _description: input.description ?? null,
    }),
  );
}

export async function cancelRecurrenceSeries(groupId: string, from: string): Promise<number> {
  return Number(await rpc<number>("cancel_recurrence_series", { _group_id: groupId, _from: from }));
}
