import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatBRLCompact, formatBRL, formatMonth } from "@/lib/formatters";

export function RevenueChart({ data }: { data: Array<{ date: string; revenue: number; expense: number }> }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Faturamento vs Despesas</div>
          <div className="text-sm font-medium text-foreground">Evolução mensal</div>
        </div>
      </div>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="grad-rev" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.4} />
                <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="grad-exp" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-destructive)" stopOpacity={0.3} />
                <stop offset="100%" stopColor="var(--color-destructive)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--color-border)" vertical={false} />
            <XAxis dataKey="date" tickFormatter={formatMonth} tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={formatBRLCompact} tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} width={64} />
            <Tooltip
              contentStyle={{
                background: "var(--color-popover)",
                border: "1px solid var(--color-border)",
                borderRadius: 8,
                fontSize: 12,
              }}
              labelFormatter={(d: string) => formatMonth(d)}
              formatter={(v: number, name: string) => [formatBRL(v), name === "revenue" ? "Receita" : "Despesa"]}
            />
            <Area type="monotone" dataKey="revenue" stroke="var(--color-chart-1)" fill="url(#grad-rev)" strokeWidth={2} isAnimationActive animationDuration={600} />
            <Area type="monotone" dataKey="expense" stroke="var(--color-destructive)" fill="url(#grad-exp)" strokeWidth={2} isAnimationActive animationDuration={600} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
