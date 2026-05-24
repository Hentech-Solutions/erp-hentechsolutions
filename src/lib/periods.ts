import { toISODate } from "./formatters";

export type Period = { from: string; to: string; label: string };

const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const endOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0);

export function currentMonth(): Period {
  const now = new Date();
  return { from: toISODate(startOfMonth(now)), to: toISODate(endOfMonth(now)), label: "Mês atual" };
}

export function lastNDays(n: number): Period {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - n + 1);
  return { from: toISODate(from), to: toISODate(to), label: `Últimos ${n} dias` };
}

export function currentYear(): Period {
  const now = new Date();
  return {
    from: toISODate(new Date(now.getFullYear(), 0, 1)),
    to: toISODate(new Date(now.getFullYear(), 11, 31)),
    label: "Ano atual",
  };
}

export function last12Months(): Period {
  const to = new Date();
  const from = new Date();
  from.setMonth(from.getMonth() - 11);
  from.setDate(1);
  return { from: toISODate(from), to: toISODate(to), label: "Últimos 12 meses" };
}

export function previousPeriod(p: Period): Period {
  const from = new Date(p.from);
  const to = new Date(p.to);
  const diff = to.getTime() - from.getTime();
  const prevTo = new Date(from.getTime() - 24 * 60 * 60 * 1000);
  const prevFrom = new Date(prevTo.getTime() - diff);
  return { from: toISODate(prevFrom), to: toISODate(prevTo), label: "Anterior" };
}

export const presets: Array<{ key: string; build: () => Period }> = [
  { key: "Mês atual", build: currentMonth },
  { key: "7 dias", build: () => lastNDays(7) },
  { key: "30 dias", build: () => lastNDays(30) },
  { key: "90 dias", build: () => lastNDays(90) },
  { key: "12 meses", build: last12Months },
  { key: "Ano", build: currentYear },
];
