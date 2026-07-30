import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, supabaseForUser, textResult } from "../supabase";

export default defineTool({
  name: "list_orders",
  title: "Listar pedidos",
  description:
    "Lista pedidos do ERP com cliente, plano, valor total e status (entrada/pendente, em_negociacao, em_execucao, pronto_entrega, concluido, cancelado).",
  inputSchema: {
    status: z.string().optional().describe("Filtrar por status exato do pedido."),
    limit: z.number().int().optional().describe("Máximo de registros (padrão 25)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return errorResult("Não autenticado.");
    let query = supabaseForUser(ctx)
      .from("orders")
      .select(
        "id, code, customer_name, customer_company, plan_name, total, currency, status, order_created_at, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(Math.min(Math.max(limit ?? 25, 1), 100));
    if (status) query = query.eq("status", status as never);
    const { data, error } = await query;
    return error ? errorResult(error.message) : textResult(data);
  },
});