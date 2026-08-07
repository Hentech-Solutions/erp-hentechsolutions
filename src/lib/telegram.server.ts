type NotifyKind = "new_order" | "sale";

const brl = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(v ?? 0));

/**
 * Sends a Telegram notification to every active recipient that has the
 * corresponding notification kind enabled. Never throws — notification
 * failures must not break the business operation.
 */
export async function notifyTelegram(kind: NotifyKind, amount: number, firstName: string): Promise<void> {
  try {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      console.error("TELEGRAM_BOT_TOKEN is not configured; skipping notification");
      return;
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const column = kind === "new_order" ? "notify_new_order" : "notify_sale";
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

    const text =
      kind === "new_order"
        ? `💹 ${firstName} fez um pedido de ${brl(amount)} Recebido`
        : `💲Venda Realizada\nValor: ${brl(amount)}`;

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
