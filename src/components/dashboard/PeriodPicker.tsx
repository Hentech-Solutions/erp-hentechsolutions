import { presets, type Period } from "@/lib/periods";
import { cn } from "@/lib/utils";

export function PeriodPicker({ period, onChange }: { period: Period; onChange: (p: Period) => void }) {
  return (
    <div className="inline-flex items-center rounded-lg border border-border bg-card p-1">
      {presets.map((p) => {
        const active = period.label === p.build().label;
        return (
          <button
            key={p.key}
            onClick={() => onChange(p.build())}
            className={cn(
              "px-3 py-1.5 text-xs rounded-md transition-colors",
              active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {p.key}
          </button>
        );
      })}
    </div>
  );
}
