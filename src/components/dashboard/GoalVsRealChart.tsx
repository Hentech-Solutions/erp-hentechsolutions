import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatBRL, formatBRLCompact, formatMonth } from "@/lib/formatters";

export function GoalVsRealChart({ data }: { data: Array<{ date: string; meta: number; real: number }> }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-4">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Metas</div>
        <div className="text-sm font-medium text-foreground">Meta vs Real por mês</div>
      </div>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="var(--color-border)" vertical={false} />
            <XAxis dataKey="date" tickFormatter={formatMonth} tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={formatBRLCompact} tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} width={64} />
            <Tooltip
              contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }}
              labelFormatter={(d: string) => formatMonth(d)}
              formatter={(v: number, n: string) => [formatBRL(v), n === "meta" ? "Meta" : "Real"]}
            />
            <Line type="monotone" dataKey="meta" stroke="var(--color-muted-foreground)" strokeWidth={2} strokeDasharray="6 4" dot={false} isAnimationActive animationDuration={600} />
            <Line type="monotone" dataKey="real" stroke="var(--color-chart-1)" strokeWidth={2.5} dot={{ r: 3 }} isAnimationActive animationDuration={600} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}