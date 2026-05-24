import { Bar, ComposedChart, CartesianGrid, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatBRL, formatBRLCompact, formatMonth } from "@/lib/formatters";

export function CashFlowChart({ data }: { data: Array<{ date: string; in: number; out: number; balance: number }> }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-4">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Fluxo de Caixa</div>
        <div className="text-sm font-medium">Entradas, saídas e saldo acumulado</div>
      </div>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="var(--color-border)" vertical={false} />
            <XAxis dataKey="date" tickFormatter={formatMonth} tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={formatBRLCompact} tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} width={64} />
            <Tooltip
              contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }}
              labelFormatter={(d: string) => formatMonth(d)}
              formatter={(v: number) => formatBRL(v)}
            />
            <Bar dataKey="in" name="Entradas" fill="var(--color-success)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="out" name="Saídas" fill="var(--color-destructive)" radius={[4, 4, 0, 0]} />
            <Line type="monotone" dataKey="balance" name="Saldo" stroke="var(--color-chart-1)" strokeWidth={2} dot={{ r: 3 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
