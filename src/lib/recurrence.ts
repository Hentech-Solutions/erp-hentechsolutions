import type { Database } from "@/integrations/supabase/types";

type Recurrence = Database["public"]["Enums"]["expense_recurrence"];

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Avanca `months` meses grampeando no ultimo dia do mes de destino.
 *
 * `Date.setMonth` transborda: 31/jan + 1 mes vira 03/mar, entao uma despesa
 * recorrente do dia 31 escorregava para o inicio do mes seguinte a cada
 * parcela. Aqui 31/jan + 1 mes = 28/fev (ou 29 em bissexto).
 */
function addMonthsClamped(y: number, m: number, day: number, months: number) {
  const total = m + months;
  const year = y + Math.floor(total / 12);
  const month = ((total % 12) + 12) % 12;
  const lastDay = new Date(year, month + 1, 0).getDate();
  return `${year}-${pad(month + 1)}-${pad(Math.min(day, lastDay))}`;
}

export function generateRecurrenceDates(
  start: string,
  recurrence: Recurrence,
  count = 12,
): string[] {
  if (recurrence === "one_time") return [start];

  // parse manual: `new Date("2026-01-31")` e UTC e `toISOString()` depois
  // devolve o dia anterior em fusos negativos como o do Brasil.
  const [y, m, d] = start.split("-").map(Number);
  if (!y || !m || !d) return [start];

  const step = recurrence === "monthly" ? 1 : recurrence === "quarterly" ? 3 : 12;
  const dates: string[] = [];
  for (let i = 0; i < count; i++) {
    dates.push(addMonthsClamped(y, m - 1, d, step * i));
  }
  return dates;
}
