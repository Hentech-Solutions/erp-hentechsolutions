import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatBRL, formatPercentPlain } from "@/lib/formatters";

export function ExpenseDonut({
  data,
}: {
  data: Array<{ name: string; amount: number; color: string; percentage: number }>;
}) {
  if (!data.length) {
    return (
      <div className="rounded-xl border border-border bg-card p-5 h-full flex items-center justify-center text-sm text-muted-foreground">
        Sem despesas no período
      </div>
    );
  }
  // o RPC devolve o top 5 já com o percentual sobre o total geral, então dá
  // para dizer quanto ficou de fora sem uma segunda consulta
  const shownTotal = data.reduce((s, d) => s + d.amount, 0);
  const shownShare = data.reduce((s, d) => s + d.percentage, 0);

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Despesas</div>
          <div className="text-sm font-medium">Top 5 categorias</div>
        </div>
        <div className="text-right">
          <div className="text-sm font-semibold tabular-nums">{formatBRL(shownTotal)}</div>
          <div className="text-[10px] text-muted-foreground">
            {formatPercentPlain(shownShare)} do total
          </div>
        </div>
      </div>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="amount"
              nameKey="name"
              innerRadius={56}
              outerRadius={88}
              paddingAngle={3}
            >
              {data.map((d, i) => (
                <Cell key={i} fill={d.color} stroke="var(--color-card)" />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: "var(--color-popover)",
                border: "1px solid var(--color-border)",
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(v: number) => formatBRL(v)}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="mt-3 space-y-1.5">
        {data.map((d) => (
          <li key={d.name} className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full" style={{ background: d.color }} />
              <span className="text-foreground/80">{d.name}</span>
            </span>
            <span className="tabular-nums text-muted-foreground">
              {formatBRL(d.amount)} · {formatPercentPlain(d.percentage)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
