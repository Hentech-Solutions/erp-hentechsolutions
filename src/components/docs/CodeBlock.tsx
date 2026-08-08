import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

/** Bloco de código com botão de copiar. */
export function CodeBlock({
  code,
  label,
  className,
}: {
  code: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard bloqueado — o texto continua selecionável */
    }
  }

  return (
    <div
      className={cn(
        "relative rounded-lg border border-border bg-[#0b1220] overflow-hidden",
        className,
      )}
    >
      {label && (
        <div className="flex items-center justify-between border-b border-border/60 bg-muted/20 px-3 py-1.5">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {label}
          </span>
        </div>
      )}
      <button
        onClick={copy}
        className="absolute right-2 top-2 z-10 inline-flex h-7 w-7 items-center justify-center rounded-md border border-border/60 bg-card/80 text-muted-foreground transition hover:text-foreground hover:bg-accent"
        style={label ? { top: "2.4rem" } : undefined}
        aria-label="Copiar"
        title="Copiar"
      >
        {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
      <pre className="overflow-x-auto p-4 pr-12 text-xs leading-relaxed">
        <code className="font-mono text-foreground/90">{code}</code>
      </pre>
    </div>
  );
}

/** Selo de método HTTP. */
export function MethodBadge({ method }: { method: "POST" | "GET" | "OPTIONS" }) {
  const style = {
    POST: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    GET: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    OPTIONS: "bg-muted text-muted-foreground border-border",
  }[method];
  return (
    <span className={cn("rounded border px-1.5 py-0.5 font-mono text-[10px] font-semibold", style)}>
      {method}
    </span>
  );
}

/** Linha da tabela de campos. */
export type FieldRow = {
  path: string;
  type: string;
  required: boolean;
  rule?: string;
  desc: string;
};

export function FieldTable({ rows }: { rows: FieldRow[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full min-w-[680px] text-sm">
        <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="px-3 py-2 text-left">Campo</th>
            <th className="px-3 py-2 text-left">Tipo</th>
            <th className="px-3 py-2 text-left">Obrig.</th>
            <th className="px-3 py-2 text-left">Regra</th>
            <th className="px-3 py-2 text-left">Descrição</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.path} className="border-t border-border align-top">
              <td className="px-3 py-2 font-mono text-xs whitespace-nowrap">{r.path}</td>
              <td className="px-3 py-2 font-mono text-xs text-muted-foreground whitespace-nowrap">
                {r.type}
              </td>
              <td className="px-3 py-2">
                {r.required ? (
                  <span className="text-xs text-destructive">sim</span>
                ) : (
                  <span className="text-xs text-muted-foreground">não</span>
                )}
              </td>
              <td className="px-3 py-2 text-xs text-muted-foreground">{r.rule ?? "—"}</td>
              <td className="px-3 py-2 text-xs text-muted-foreground">{r.desc}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
