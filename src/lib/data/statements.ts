import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type StatementPeriod = "daily" | "weekly" | "monthly";
export type FinancialStatement = {
  id: string;
  title: string;
  period_type: StatementPeriod;
  start_date: string;
  end_date: string;
  generated_by: string | null;
  generated_by_email: string | null;
  file_url: string;
  file_path: string;
  created_at: string;
};

export type StatementFilters = {
  period_type?: StatementPeriod | "all";
  from?: string;
  to?: string;
};

export async function listStatements(f: StatementFilters = {}): Promise<FinancialStatement[]> {
  let q = supabase.from("financial_statements" as any).select("*").order("created_at", { ascending: false });
  if (f.period_type && f.period_type !== "all") q = q.eq("period_type", f.period_type);
  if (f.from) q = q.gte("start_date", f.from);
  if (f.to) q = q.lte("end_date", f.to);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as unknown as FinancialStatement[];
}

export async function deleteStatement(id: string, filePath: string) {
  await supabase.storage.from("statements").remove([filePath]);
  const { error } = await supabase.from("financial_statements" as any).delete().eq("id", id);
  if (error) throw error;
}

export async function uploadStatement(opts: {
  pdfBlob: Blob;
  title: string;
  periodType: StatementPeriod;
  startDate: string;
  endDate: string;
  userId: string;
  email: string | null;
}): Promise<FinancialStatement> {
  const safe = opts.title.replace(/[^a-zA-Z0-9-_]+/g, "_");
  const path = `${opts.userId}/${Date.now()}_${safe}.pdf`;
  const { error: upErr } = await supabase.storage
    .from("statements")
    .upload(path, opts.pdfBlob, { contentType: "application/pdf", upsert: false });
  if (upErr) throw upErr;
  const { data: signed } = await supabase.storage.from("statements").createSignedUrl(path, 60 * 60 * 24 * 365);
  const file_url = signed?.signedUrl ?? "";
  const { data, error } = await supabase
    .from("financial_statements" as any)
    .insert({
      title: opts.title,
      period_type: opts.periodType,
      start_date: opts.startDate,
      end_date: opts.endDate,
      generated_by: opts.userId,
      generated_by_email: opts.email,
      file_url,
      file_path: path,
    } as any)
    .select()
    .single();
  if (error) throw error;
  return data as unknown as FinancialStatement;
}

export async function getSignedUrl(path: string) {
  const { data, error } = await supabase.storage.from("statements").createSignedUrl(path, 60 * 60);
  if (error) throw error;
  return data.signedUrl;
}

// Fetch sales entries with goal/product info for a date range
export async function fetchSalesForRange(from: string, to: string) {
  const { data, error } = await supabase
    .from("sales_entries")
    .select("id, sale_date, amount, notes, product_id, goal_id, products(name), sales_goals(title, category)")
    .gte("sale_date", from)
    .lte("sale_date", to)
    .order("sale_date", { ascending: true });
  if (error) throw error;
  return (data ?? []) as any[];
}

export async function fetchFinancialForRange(from: string, to: string) {
  const { data, error } = await supabase
    .from("financial_entries")
    .select("id, reference_date, description, type, amount, financial_categories(name)")
    .is("deleted_at", null)
    .gte("reference_date", from)
    .lte("reference_date", to)
    .order("reference_date", { ascending: true });
  if (error) throw error;
  return (data ?? []) as any[];
}

export async function fetchSalesSummary(from: string, to: string) {
  const rows = await fetchSalesForRange(from, to);
  const total = rows.reduce((s, r) => s + Number(r.amount ?? 0), 0);
  const count = rows.length;
  const avg = count > 0 ? total / count : 0;
  return { total, count, avg, rows };
}

export function previousRange(from: string, to: string): { from: string; to: string } {
  const f = new Date(from);
  const t = new Date(to);
  const dayMs = 24 * 60 * 60 * 1000;
  const days = Math.round((t.getTime() - f.getTime()) / dayMs) + 1;
  const prevTo = new Date(f.getTime() - dayMs);
  const prevFrom = new Date(prevTo.getTime() - (days - 1) * dayMs);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return { from: iso(prevFrom), to: iso(prevTo) };
}

// Avoid Database import warning
export type _DB = Database;