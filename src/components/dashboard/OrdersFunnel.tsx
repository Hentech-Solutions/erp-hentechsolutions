import { KPICard } from "./KPICard";
import type { OrdersFunnel as Funnel } from "@/lib/data/dashboard";
import { STATUS_LABEL, type OrderStatus } from "@/lib/data/orders";
import { formatBRL, formatPercentPlain } from "@/lib/formatters";
import { cn } from "@/lib/utils";

const COLORS: Record<string, string> = {
  pendente: "#f59e0b",
  em_negociacao: "#8b5cf6",
  em_execucao: "#3b82f6",
  pronto_entrega: "#06b6d4",
  concluido: "#10b981",
  cancelado: "#f43f5e",
};

/**
 * Funil real, não apenas barras por status: mostra quanto sobra a cada
 * estágio, a conversão (excluindo cancelados) e o tempo médio de ciclo.
 */
export function OrdersFunnel({ data, loading }: { data?: Funnel; loading?: boolean }) {
  const stages = (data?.stages ?? []).filter((s) => s.status !== "cancelado");
  const cancelled = data?.stages.find((s) => s.status === "cancelado");
  const max = Math.max(...stages.map((s) => s.count), 1);

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Funil de pedidos</h2>
        <p className="text-sm text-muted-foreground">
          Pedidos recebidos no período e onde eles estão
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          label="Pedidos no período"
          value={String(data?.total ?? 0)}
          hint={formatBRL(data?.totalValue ?? 0)}
          loading={loading}
          to="/pedidos"
          emphasis="primary"
        />
        <KPICard
          label="Conversão"
          value={formatPercentPlain(data?.conversion ?? 0)}
          hint="concluídos ÷ não cancelados"
          loading={loading}
          tooltip="Cancelados saem do denominador: são perda, não pipeline em aberto."
        />
        <KPICard
          label="Ciclo médio"
          value={data?.leadTimeDays != null ? `${data.leadTimeDays} dias` : "—"}
          hint="pedido → concluído"
          loading={loading}
        />
        <KPICard
          label="Entregue sem pagar"
          value={formatBRL(data?.deliveredUnpaidValue ?? 0)}
          hint={
            data && data.cancelRate > 0
              ? `${formatPercentPlain(data.cancelRate)} cancelados`
              : undefined
          }
          loading={loading}
          emphasis={(data?.deliveredUnpaidValue ?? 0) > 0 ? "danger" : "default"}
          to="/contas"
        />
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <div className="text-sm font-medium mb-4">Distribuição por estágio</div>
        {data && data.total === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Nenhum pedido recebido no período selecionado.
          </p>
        ) : (
          <div className="space-y-3">
            {stages.map((s) => (
              <div key={s.status} className="space-y-1">
                <div className="flex items-baseline justify-between gap-3 text-xs">
                  <span className="inline-flex items-center gap-2">
                    <span
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ background: COLORS[s.status] }}
                    />
                    {STATUS_LABEL[s.status as OrderStatus] ?? s.status}
                  </span>
                  <span className="tabular-nums">
                    <span className="font-medium">{s.count}</span>
                    <span className="ml-2 text-muted-foreground">{formatBRL(s.value)}</span>
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.max((s.count / max) * 100, s.count > 0 ? 3 : 0)}%`,
                      background: COLORS[s.status],
                    }}
                  />
                </div>
              </div>
            ))}

            {cancelled && cancelled.count > 0 && (
              <div className="flex items-baseline justify-between gap-3 border-t border-border pt-3 text-xs">
                <span className="inline-flex items-center gap-2 text-muted-foreground">
                  <span
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{ background: COLORS.cancelado }}
                  />
                  Cancelados
                </span>
                <span className={cn("tabular-nums text-muted-foreground")}>
                  <span className="font-medium">{cancelled.count}</span>
                  <span className="ml-2">{formatBRL(cancelled.value)}</span>
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
