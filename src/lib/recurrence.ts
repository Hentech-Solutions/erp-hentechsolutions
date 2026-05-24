import type { Database } from "@/integrations/supabase/types";

type Recurrence = Database["public"]["Enums"]["expense_recurrence"];

export function generateRecurrenceDates(start: string, recurrence: Recurrence, count = 12): string[] {
  if (recurrence === "one_time") return [start];
  const base = new Date(start + "T00:00:00");
  const dates: string[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(base);
    if (recurrence === "monthly") d.setMonth(d.getMonth() + i);
    if (recurrence === "quarterly") d.setMonth(d.getMonth() + i * 3);
    if (recurrence === "annual") d.setFullYear(d.getFullYear() + i);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}
