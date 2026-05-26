import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatBRL, formatBRLCompact } from "@/lib/formatters";

export function QuarterlyAccumChart({
  data,
}: {
  data: Array<{ week: string; real: number; acumulado: number; meta: number }>;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-4">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Metas</div>
        <div className="text-sm font-medium text-foreground">Acumulado trimestral por semana</div>
      </div>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="var(--color-border)" vertical={false} />
            <XAxis dataKey="week" tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={formatBRLCompact} tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} width={64} />
            <Tooltip
              contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }}
              formatter={(v: number, n: string) => [formatBRL(v), n === "real" ? "Vendas da semana" : n === "acumulado" ? "Acumulado" : "Meta trimestral"]}
            />
            <Bar dataKey="real" fill="var(--color-chart-2)" radius={[4, 4, 0, 0]} isAnimationActive animationDuration={600} />
            <Line type="monotone" dataKey="acumulado" stroke="var(--color-chart-1)" strokeWidth={2.5} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="meta" stroke="var(--color-muted-foreground)" strokeWidth={2} strokeDasharray="6 4" dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}