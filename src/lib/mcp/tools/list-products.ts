import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, supabaseForUser, textResult } from "../supabase";

export default defineTool({
  name: "list_products",
  title: "Listar produtos",
  description: "Lista produtos ativos do ERP com preço, custo e categoria. Aceita busca por nome.",
  inputSchema: {
    search: z.string().optional().describe("Texto para filtrar pelo nome do produto."),
    limit: z.number().int().optional().describe("Máximo de registros (padrão 25)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ search, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return errorResult("Não autenticado.");
    let query = supabaseForUser(ctx)
      .from("products")
      .select("id, name, sku, price, cost, is_active, category_id, created_at")
      .is("deleted_at", null)
      .order("name")
      .limit(Math.min(Math.max(limit ?? 25, 1), 100));
    if (search) query = query.ilike("name", `%${search}%`);
    const { data, error } = await query;
    return error ? errorResult(error.message) : textResult(data);
  },
});