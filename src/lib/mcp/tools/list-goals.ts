import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, supabaseForUser, textResult } from "../supabase";

export default defineTool({
  name: "list_goals",
  title: "Listar metas de vendas",
  description: "Lista as metas de vendas/faturamento com valor alvo, realizado e período.",
  inputSchema: {
    period_type: z.string().optional().describe("Filtrar pelo tipo de período (weekly, monthly, quarterly)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ period_type }, ctx) => {
    if (!ctx.isAuthenticated()) return errorResult("Não autenticado.");
    let query = supabaseForUser(ctx)
      .from("sales_goals")
      .select("*")
      .order("start_date", { ascending: false })
      .limit(50);
    if (period_type) query = query.eq("period_type", period_type as never);
    const { data, error } = await query;
    return error ? errorResult(error.message) : textResult(data);
  },
});