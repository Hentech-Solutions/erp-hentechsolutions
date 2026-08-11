export type NotifyKind = "new_order" | "sale" | "new_lead";

/**
 * Cada tipo de aviso tem seu próprio interruptor por destinatário. Lead teve
 * coluna própria justamente para dar para desligar aviso de lead sem desligar
 * aviso de pedido novo — antes os dois dividiam `notify_new_order`.
 */
export const NOTIFY_COLUMN: Record<NotifyKind, string> = {
  new_order: "notify_new_order",
  sale: "notify_sale",
  new_lead: "notify_new_lead",
};

const brl = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(v ?? 0));

/**
 * Texto da notificação, isolado do envio.
 *
 * Fica separado porque o disparo depende de TELEGRAM_BOT_TOKEN, que só existe
 * como secret em produção — sem essa extração, a única forma de conferir a
 * mensagem seria mandar uma de verdade para os sócios.
 *
 * `new_lead` não leva valor de propósito: o lead chega da landing page sem
 * orçamento, e escrever "R$ 0,00" na notificação afirmaria preço zero.
 */
export function buildNotificationText(
  kind: NotifyKind,
  amount: number | null,
  firstName: string,
): string {
  switch (kind) {
    case "new_lead":
      return `📝 ${firstName} solicitou um orçamento`;
    case "new_order":
      return `💹 ${firstName} fez um pedido de ${brl(amount ?? 0)} Recebido`;
    case "sale":
      return `💲Venda Realizada\nValor: ${brl(amount ?? 0)}`;
  }
}

/**
 * Sends a Telegram notification to every active recipient that has the
 * corresponding notification kind enabled. Never throws — notification
 * failures must not break the business operation.
 */
export async function notifyTelegram(
  kind: NotifyKind,
  amount: number | null,
  firstName: string,
): Promise<void> {
  try {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      console.error("TELEGRAM_BOT_TOKEN is not configured; skipping notification");
      return;
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const column = NOTIFY_COLUMN[kind];
    const { data, error } = await supabaseAdmin
      .from("telegram_recipients")
      .select("chat_id")
      .eq("is_active", true)
      .eq(column, true);
    if (error) {
      console.error("Failed to load telegram recipients:", error.message);
      return;
    }
    const recipients = (data ?? []) as { chat_id: string }[];
    if (recipients.length === 0) return;

    const text = buildNotificationText(kind, amount, firstName);

    await Promise.all(
      recipients.map(async (r) => {
        try {
          const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: r.chat_id, text }),
          });
          if (!res.ok) {
            console.error(`Telegram sendMessage failed [${res.status}]: ${await res.text()}`);
          }
        } catch (e) {
          console.error("Telegram sendMessage error:", (e as Error).message);
        }
      }),
    );
  } catch (e) {
    console.error("notifyTelegram error:", (e as Error).message);
  }
}
