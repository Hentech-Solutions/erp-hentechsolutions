import type { ConcentrationRow, PlanPerformanceRow } from "@/lib/data/dashboard";
import { formatBRL, formatPercentPlain } from "@/lib/formatters";
import { cn } from "@/lib/utils";

/**
 * Concentração de receita: quanto do faturamento depende de um cliente só.
 * É risco que não aparecia em lugar nenhum do sistema.
 */
export function ConcentrationCard({
  data,
  loading,
}: {
  data: ConcentrationRow[];
  loading?: boolean;
}) {
  const top = data[0];
  const risky = (top?.share ?? 0) >= 40;

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-4">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Concentração
        </div>
        <div className="text-sm font-medium">Receita por cliente</div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-8 rounded bg-muted animate-pulse" />
          ))}
        </div>
      ) : data.length === 0 ? (
        <p className="py-6 text-center text-xs text-muted-foreground">Sem receita no período.</p>
      ) : (
        <>
          <ul className="space-y-2.5">
            {data.map((c) => (
              <li key={c.name} className="space-y-1">
                <div className="flex items-baseline justify-between gap-3 text-xs">
                  <span className="truncate">{c.name}</span>
                  <span className="tabular-nums shrink-0">
                    <span className="font-medium">{formatPercentPlain(c.share)}</span>
                    <span className="ml-2 text-muted-foreground">{formatBRL(c.revenue)}</span>
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      c.share >= 40 ? "bg-warning" : "bg-primary",
                    )}
                    style={{ width: `${Math.max(c.share, 2)}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
          {risky && (
            <p className="mt-4 rounded-md border border-warning/30 bg-warning/5 px-3 py-2 text-[11px] text-muted-foreground">
              <strong className="text-foreground">{top.name}</strong> responde por{" "}
              {formatPercentPlain(top.share)} do faturamento do período. Perder esse cliente derruba
              o resultado.
            </p>
          )}
        </>
      )}
    </div>
  );
}

/** Margem por plano — só faz sentido depois que o catálogo tem custo. */
export function PlanPerformanceCard({
  data,
  loading,
}: {
  data: PlanPerformanceRow[];
  loading?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-4">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Planos</div>
        <div className="text-sm font-medium">Receita e margem por plano</div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[0, 1].map((i) => (
            <div key={i} className="h-10 rounded bg-muted animate-pulse" />
          ))}
        </div>
      ) : data.length === 0 ? (
        <p className="py-6 text-center text-xs text-muted-foreground">
          Nenhum pedido concluído no período.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="pb-2 text-left">Plano</th>
                <th className="pb-2 text-right">Qtd</th>
                <th className="pb-2 text-right">Receita</th>
                <th className="pb-2 text-right">Margem</th>
              </tr>
            </thead>
            <tbody>
              {data.map((p) => (
                <tr key={p.name} className="border-t border-border">
                  <td className="py-2 pr-2 truncate max-w-[10rem]">{p.name}</td>
                  <td className="py-2 text-right tabular-nums">{p.orders}</td>
                  <td className="py-2 text-right tabular-nums">{formatBRL(p.revenue)}</td>
                  <td
                    className={cn(
                      "py-2 text-right tabular-nums font-medium",
                      p.margin >= 50
                        ? "text-success"
                        : p.margin >= 20
                          ? "text-warning"
                          : "text-destructive",
                    )}
                  >
                    {formatPercentPlain(p.margin)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.some((p) => p.cost === 0) && (
            <p className="mt-3 text-[11px] text-muted-foreground">
              Planos com custo zerado aparecem com 100% de margem. Cadastre o custo em Planos.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
