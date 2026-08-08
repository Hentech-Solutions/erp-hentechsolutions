import { rpc } from "@/lib/data/rpc";

export type AuditRow = {
  id: number;
  table_name: string;
  record_id: string;
  operation: "INSERT" | "UPDATE" | "DELETE";
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  user_email: string | null;
  changed_at: string;
  total_count: number;
};

export const AUDITED_TABLES = [
  "financial_entries",
  "sales",
  "sale_items",
  "products",
  "customers",
  "orders",
  "sales_goals",
  "financial_categories",
  "user_roles",
  "api_clients",
] as const;

/** Campos que nunca interessam num diff de auditoria. */
const NOISE = new Set(["updated_at", "created_at"]);

export type FieldChange = { field: string; from: unknown; to: unknown };

/** Diferenca campo a campo entre old_data e new_data. */
export function diffFields(row: AuditRow): FieldChange[] {
  const before = row.old_data ?? {};
  const after = row.new_data ?? {};
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  const out: FieldChange[] = [];
  for (const k of keys) {
    if (NOISE.has(k)) continue;
    const a = before[k as keyof typeof before];
    const b = after[k as keyof typeof after];
    if (JSON.stringify(a) !== JSON.stringify(b)) out.push({ field: k, from: a, to: b });
  }
  return out.sort((x, y) => x.field.localeCompare(y.field));
}

export async function listAuditLog(f: {
  table?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}) {
  const page = f.page ?? 1;
  const pageSize = f.pageSize ?? 100;
  const rows = await rpc<AuditRow[]>("get_audit_log", {
    _table: f.table && f.table !== "all" ? f.table : null,
    _from: f.from ?? null,
    _to: f.to ?? null,
    _limit: pageSize,
    _offset: (page - 1) * pageSize,
  });
  return {
    data: rows ?? [],
    total: Number(rows?.[0]?.total_count ?? 0),
    page,
    pageSize,
  };
}
