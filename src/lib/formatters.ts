export const formatBRL = (value: number | null | undefined) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    Number(value ?? 0),
  );

export const formatBRLCompact = (value: number | null | undefined) => {
  const n = Number(value ?? 0);
  if (Math.abs(n) >= 1_000_000) return `R$ ${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `R$ ${(n / 1_000).toFixed(1)}k`;
  return formatBRL(n);
};

export const formatPercent = (value: number | null | undefined, digits = 1) => {
  const n = Number(value ?? 0);
  return `${n >= 0 ? "+" : ""}${n.toFixed(digits)}%`;
};

export const formatPercentPlain = (value: number | null | undefined, digits = 1) =>
  `${Number(value ?? 0).toFixed(digits)}%`;

export const formatDate = (d: string | Date) =>
  new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(
    typeof d === "string" ? new Date(d) : d,
  );

export const formatMonth = (d: string | Date) =>
  new Intl.DateTimeFormat("pt-BR", { month: "short", year: "2-digit" }).format(
    typeof d === "string" ? new Date(d) : d,
  );

export const toISODate = (d: Date) => d.toISOString().slice(0, 10);
