import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/** Notifies partners on Telegram that a sale was completed. */
export const notifySaleCompleted = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ amount: z.number().nonnegative() }).parse(input))
  .handler(async ({ data }) => {
    const { notifyTelegram } = await import("@/lib/telegram.server");
    await notifyTelegram("sale", data.amount, "");
    return { ok: true };
  });

/** Sends a test notification to validate the bot configuration. */
export const sendTelegramTest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { notifyTelegram } = await import("@/lib/telegram.server");
    await notifyTelegram("new_order", 0, "");
    return { ok: true };
  });
