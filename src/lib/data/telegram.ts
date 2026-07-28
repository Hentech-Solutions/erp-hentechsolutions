import { supabase } from "@/integrations/supabase/client";

export type TelegramRecipient = {
  id: string;
  label: string;
  chat_id: string;
  notify_new_order: boolean;
  notify_sale: boolean;
  is_active: boolean;
  created_at: string;
};

const COLS = "id, label, chat_id, notify_new_order, notify_sale, is_active, created_at";

export async function listTelegramRecipients(): Promise<TelegramRecipient[]> {
  const { data, error } = await supabase
    .from("telegram_recipients" as never)
    .select(COLS)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as TelegramRecipient[];
}

export async function createTelegramRecipient(input: { label: string; chat_id: string }) {
  const { error } = await supabase
    .from("telegram_recipients" as never)
    .insert({ label: input.label, chat_id: input.chat_id } as never);
  if (error) throw error;
}

export async function updateTelegramRecipient(
  id: string,
  patch: Partial<Pick<TelegramRecipient, "label" | "chat_id" | "notify_new_order" | "notify_sale" | "is_active">>,
) {
  const { error } = await supabase
    .from("telegram_recipients" as never)
    .update(patch as never)
    .eq("id", id);
  if (error) throw error;
}

export async function deleteTelegramRecipient(id: string) {
  const { error } = await supabase.from("telegram_recipients" as never).delete().eq("id", id);
  if (error) throw error;
}
