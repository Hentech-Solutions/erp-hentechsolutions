import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, supabaseForUser, textResult } from "../supabase";

export default defineTool({
  name: "list_customers",
  title: "Listar clientes",
  description: "Lista clientes cadastrados no ERP, com busca opcional por nome, e-mail ou documento.",
  inputSchema: {
    search: z.string().optional().describe("Texto para filtrar por nome do cliente."),
    limit: z.number().int().optional().describe("Máximo de registros (padrão 25)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ search, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return errorResult("Não autenticado.");
    let query = supabaseForUser(ctx)
      .from("customers")
      .select("id, name, email, phone, document, created_at")
      .is("deleted_at", null)
      .order("name")
      .limit(Math.min(Math.max(limit ?? 25, 1), 100));
    if (search) query = query.ilike("name", `%${search}%`);
    const { data, error } = await query;
    return error ? errorResult(error.message) : textResult(data);
  },
});