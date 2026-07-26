import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { KPICard } from "./KPICard";
import { formatBRL, formatBRLCompact, formatPercentPlain } from "@/lib/formatters";
import { getOrdersStats, STATUS_LABEL, type OrderStatus } from "@/lib/data/orders";

const COLORS: Record<OrderStatus, string> = {
  pendente: "#f59e0b",
  em_negociacao: "#8b5cf6",
  em_execucao: "#3b82f6",
  pronto_entrega: "#06b6d4",
  concluido: "#10b981",
  cancelado: "#f43f5e",
};

export function OrdersSection() {
  const { data } = useQuery({ queryKey: ["orders", "stats"], queryFn: getOrdersStats });
  const chart = (data?.byStatus ?? []).map((s) => ({
    name: STATUS_LABEL[s.status],
    status: s.status,
    value: s.value,
    count: s.count,
  }));

  return (
    <section className="space-y-4 rounded-2xl border border-border bg-card/40 p-5">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Pedidos (integração)</h2>
        <p className="text-sm text-muted-foreground">
          Métricas do pipeline de pedidos recebidos via API
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard label="Pedidos totais" value={String(data?.total ?? 0)} emphasis="primary" />
        <KPICard label="Valor agregado" value={formatBRL(data?.totalValue ?? 0)} />
        <KPICard label="Ticket médio" value={formatBRL(data?.ticket ?? 0)} />
        <KPICard label="Taxa de conclusão" value={formatPercentPlain(data?.conversion ?? 0)} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 rounded-xl border border-border bg-card p-5">
          <div className="text-sm font-medium mb-4">Valor por estágio</div>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="currentColor" className="text-muted-foreground" interval={0} />
                <YAxis tickFormatter={(v) => formatBRLCompact(Number(v))} tick={{ fontSize: 11 }} stroke="currentColor" className="text-muted-foreground" />
                <Tooltip
                  formatter={(v: number) => formatBRL(v)}
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {chart.map((c) => (
                    <Cell key={c.status} fill={COLORS[c.status as OrderStatus]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <div className="text-sm font-medium mb-4">Pedidos por estágio</div>
          <ul className="space-y-3">
            {chart.map((c) => (
              <li key={c.status} className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-sm min-w-0">
                  <span
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ background: COLORS[c.status as OrderStatus] }}
                  />
                  <span className="truncate">{c.name}</span>
                </span>
                <span className="text-right shrink-0">
                  <span className="text-sm font-semibold tabular-nums">{c.count}</span>
                  <span className="block text-[11px] text-muted-foreground tabular-nums">
                    {formatBRL(c.value)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}