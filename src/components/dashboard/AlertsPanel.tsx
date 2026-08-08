import { AlertTriangle, Info, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

const tone = {
  info: "text-foreground/80 border-border bg-card",
  warning: "text-warning border-warning/30 bg-warning/5",
  critical: "text-destructive border-destructive/30 bg-destructive/5",
} as const;

const icon = { info: Info, warning: AlertTriangle, critical: ShieldAlert };

export function AlertsPanel({
  alerts,
}: {
  alerts: Array<{ severity: "info" | "warning" | "critical"; title: string; message: string }>;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-3">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Alertas</div>
        <div className="text-sm font-medium">Eventos recentes</div>
      </div>
      {alerts.length === 0 ? (
        <p className="text-xs text-muted-foreground py-6 text-center">Nenhum alerta no momento</p>
      ) : (
        <ul className="space-y-2">
          {alerts.map((a, i) => {
            const Icon = icon[a.severity];
            return (
              <li
                key={i}
                className={cn(
                  "flex items-start gap-3 rounded-md border p-3 text-xs",
                  tone[a.severity],
                )}
              >
                <Icon className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <div className="font-medium">{a.title}</div>
                  <div className="opacity-80">{a.message}</div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
