import type { Dre } from "@/lib/data/financial";
import { formatBRL, formatPercentPlain } from "@/lib/formatters";
import { cn } from "@/lib/utils";

function Line({
  label,
  value,
  tone = "normal",
  indent = false,
  hint,
}: {
  label: string;
  value: number;
  tone?: "normal" | "negative" | "subtotal" | "total";
  indent?: boolean;
  hint?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-baseline justify-between gap-4 py-1.5",
        tone === "subtotal" && "border-t border-border pt-2.5 font-medium",
        tone === "total" && "border-t-2 border-border pt-3 font-semibold",
      )}
    >
      <span
        className={cn(
          "text-muted-foreground",
          indent && "pl-4 text-xs",
          tone === "total" && "text-foreground",
        )}
      >
        {label}
        {hint && <span className="ml-1.5 text-[10px] text-muted-foreground/60">{hint}</span>}
      </span>
      <span
        className={cn(
          "tabular-nums shrink-0",
          tone === "negative" && "text-destructive",
          tone === "total" && (value >= 0 ? "text-success" : "text-destructive"),
        )}
      >
        {tone === "negative" && value > 0 ? "− " : ""}
        {formatBRL(value)}
      </span>
    </div>
  );
}

/** DRE em cascata: receita → CMV → lucro bruto → despesas → resultado. */
export function DreStatement({ dre }: { dre?: Dre }) {
  if (!dre) {
    return (
      <div className="rounded-xl border border-border bg-card p-5">
        <p className="py-8 text-center text-sm text-muted-foreground">Carregando…</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
      <div className="lg:col-span-3 rounded-xl border border-border bg-card p-5 text-sm">
        <h3 className="text-sm font-semibold tracking-tight mb-3">Demonstrativo de resultado</h3>

        <Line label="Receita bruta" value={dre.revenue} />
        {dre.discounts > 0 && (
          <Line label="Descontos concedidos" value={dre.discounts} tone="negative" indent />
        )}
        <Line label="Custo dos produtos vendidos (CMV)" value={dre.cogs} tone="negative" indent />
        <Line label="Lucro bruto" value={dre.grossProfit} tone="subtotal" />

        <div className="mt-3">
          <Line label="Despesas operacionais" value={dre.operatingExpenses} tone="negative" />
          {dre.expensesByCategory.map((c) => (
            <div key={c.name} className="flex items-baseline justify-between gap-4 py-1 pl-4">
              <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                <span
                  className="h-1.5 w-1.5 rounded-full shrink-0"
                  style={{ background: c.color }}
                />
                {c.name}
              </span>
              <span className="tabular-nums text-xs text-muted-foreground shrink-0">
                {formatBRL(c.amount)}
              </span>
            </div>
          ))}
        </div>

        <Line label="Resultado operacional" value={dre.operatingProfit} tone="subtotal" />
        <Line label="Resultado líquido" value={dre.netProfit} tone="total" />
      </div>

      <div className="lg:col-span-2 rounded-xl border border-border bg-card p-5">
        <h3 className="text-sm font-semibold tracking-tight mb-4">Margens</h3>
        <div className="space-y-4">
          {[
            { label: "Margem bruta", value: dre.grossMargin, hint: "após CMV" },
            { label: "Margem operacional", value: dre.operatingMargin, hint: "após despesas" },
            { label: "Margem líquida", value: dre.netMargin, hint: "resultado final" },
          ].map((m) => (
            <div key={m.label} className="space-y-1.5">
              <div className="flex items-baseline justify-between text-xs">
                <span className="text-muted-foreground">
                  {m.label}
                  <span className="ml-1.5 text-[10px] text-muted-foreground/60">{m.hint}</span>
                </span>
                <span
                  className={cn(
                    "tabular-nums font-medium",
                    m.value >= 0 ? "text-success" : "text-destructive",
                  )}
                >
                  {formatPercentPlain(m.value)}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full",
                    m.value >= 0 ? "bg-primary" : "bg-destructive",
                  )}
                  style={{ width: `${Math.min(Math.abs(m.value), 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {dre.revenue === 0 && (
          <p className="mt-5 text-xs text-muted-foreground">
            Sem receita no período — as margens ficam zeradas por definição.
          </p>
        )}
      </div>
    </div>
  );
}
