import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, supabaseForUser, textResult } from "../supabase";

export default defineTool({
  name: "financial_summary",
  title: "Resumo financeiro",
  description:
    "Resume receitas, despesas e lucro dos lançamentos financeiros em um intervalo de datas (formato AAAA-MM-DD).",
  inputSchema: {
    from: z.string().describe("Data inicial no formato AAAA-MM-DD."),
    to: z.string().describe("Data final no formato AAAA-MM-DD."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ from, to }, ctx) => {
    if (!ctx.isAuthenticated()) return errorResult("Não autenticado.");
    const { data, error } = await supabaseForUser(ctx)
      .from("financial_entries")
      .select("amount, type")
      .is("deleted_at", null)
      .gte("reference_date", from)
      .lte("reference_date", to);
    if (error) return errorResult(error.message);
    const rows = data ?? [];
    const receita = rows.filter((r) => r.type === "receita").reduce((s, r) => s + Number(r.amount), 0);
    const despesa = rows.filter((r) => r.type !== "receita").reduce((s, r) => s + Number(r.amount), 0);
    const summary = { from, to, entries: rows.length, receita, despesa, lucro: receita - despesa };
    return { ...textResult(summary), structuredContent: summary };
  },
});