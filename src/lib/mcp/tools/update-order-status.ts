import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, supabaseForUser, textResult } from "../supabase";

const STATUSES = ["pendente", "em_negociacao", "em_execucao", "pronto_entrega", "concluido", "cancelado"];

export default defineTool({
  name: "update_order_status",
  title: "Atualizar status do pedido",
  description:
    "Atualiza o status de um pedido do ERP. Status válidos: pendente, em_negociacao, em_execucao, pronto_entrega, concluido, cancelado.",
  inputSchema: {
    order_id: z.string().describe("ID do pedido (UUID)."),
    status: z.string().describe("Novo status do pedido."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  handler: async ({ order_id, status }, ctx) => {
    if (!ctx.isAuthenticated()) return errorResult("Não autenticado.");
    if (!STATUSES.includes(status)) return errorResult(`Status inválido. Use um de: ${STATUSES.join(", ")}.`);
    const { data, error } = await supabaseForUser(ctx)
      .from("orders")
      .update({ status: status as never, status_changed_at: new Date().toISOString() })
      .eq("id", order_id)
      .select("id, code, status")
      .maybeSingle();
    if (error) return errorResult(error.message);
    if (!data) return errorResult("Pedido não encontrado.");
    return { ...textResult(data), structuredContent: { order: data } };
  },
});