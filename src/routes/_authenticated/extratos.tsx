import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Plus, Download, Eye, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useUserRole } from "@/hooks/use-user-role";
import {
  deleteStatement,
  fetchFinancialForRange,
  fetchSalesSummary,
  getSignedUrl,
  listStatements,
  previousRange,
  uploadStatement,
  type FinancialStatement,
  type StatementPeriod,
} from "@/lib/data/statements";
import { generateStatementPdf } from "@/lib/pdf/generate-statement";
import { formatDate } from "@/lib/formatters";

export const Route = createFileRoute("/_authenticated/extratos")({
  head: () => ({ meta: [{ title: "Extratos Financeiros" }] }),
  component: StatementsPage,
});

function periodBadge(p: StatementPeriod) {
  if (p === "daily")
    return <Badge className="bg-amber-500/15 text-amber-500 border-amber-500/30">Diário</Badge>;
  if (p === "weekly")
    return <Badge className="bg-emerald-500/15 text-emerald-500 border-emerald-500/30">Semanal</Badge>;
  return <Badge className="bg-blue-500/15 text-blue-500 border-blue-500/30">Mensal</Badge>;
}

function StatementsPage() {
  const navigate = useNavigate();
  const role = useUserRole();
  const qc = useQueryClient();
  const [filterType, setFilterType] = useState<"all" | StatementPeriod>("all");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");

  useEffect(() => {
    if (!role.loading && !role.canAccessStatements) {
      toast.error("Acesso restrito a administradores e gerentes");
      navigate({ to: "/" });
    }
  }, [role.loading, role.canAccessStatements, navigate]);

  const statements = useQuery({
    queryKey: ["statements", filterType, filterFrom, filterTo],
    queryFn: () =>
      listStatements({
        period_type: filterType,
        from: filterFrom || undefined,
        to: filterTo || undefined,
      }),
    enabled: role.canAccessStatements,
  });

  async function handleView(s: FinancialStatement) {
    try {
      const url = await getSignedUrl(s.file_path);
      window.open(url, "_blank");
    } catch (e: any) {
      toast.error(e.message);
    }
  }
  async function handleDownload(s: FinancialStatement) {
    try {
      const url = await getSignedUrl(s.file_path);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${s.title}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e: any) {
      toast.error(e.message);
    }
  }
  async function handleDelete(s: FinancialStatement) {
    if (!confirm(`Excluir o extrato "${s.title}"?`)) return;
    try {
      await deleteStatement(s.id, s.file_path);
      toast.success("Extrato excluído");
      qc.invalidateQueries({ queryKey: ["statements"] });
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  if (role.loading) {
    return (
      <AppShell title="Extratos Financeiros">
        <p className="text-sm text-muted-foreground">Carregando…</p>
      </AppShell>
    );
  }
  if (!role.canAccessStatements) return null;

  return (
    <AppShell title="Extratos Financeiros">
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Extratos Financeiros</h2>
            <p className="text-sm text-muted-foreground">
              Gere e arquive extratos em PDF dos seus períodos financeiros
            </p>
          </div>
          <GenerateModal
            onCreated={() => qc.invalidateQueries({ queryKey: ["statements"] })}
            userId={role.userId!}
            email={role.email}
          />
        </div>

        <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card p-3">
          <div>
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Tipo</Label>
            <div className="inline-flex rounded-md border border-border bg-background mt-1">
              {(["all", "daily", "weekly", "monthly"] as const).map((k) => (
                <button
                  key={k}
                  onClick={() => setFilterType(k)}
                  className={cn(
                    "px-3 py-1.5 text-xs",
                    filterType === k ? "bg-primary text-primary-foreground rounded-md" : "text-muted-foreground",
                  )}
                >
                  {k === "all" ? "Todos" : k === "daily" ? "Diário" : k === "weekly" ? "Semanal" : "Mensal"}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">De</Label>
            <Input type="date" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Até</Label>
            <Input type="date" value={filterTo} onChange={(e) => setFilterTo(e.target.value)} className="mt-1" />
          </div>
        </div>

        {statements.isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando extratos…</p>
        ) : (statements.data ?? []).length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card/40 p-10 text-center">
            <FileText className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">Nenhum extrato gerado ainda.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {(statements.data ?? []).map((s) => (
              <Card key={s.id}>
                <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <FileText className="h-5 w-5 text-primary mt-1" />
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-medium text-sm">{s.title}</h3>
                        {periodBadge(s.period_type)}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDate(s.start_date)} — {formatDate(s.end_date)} · emitido em {formatDate(s.created_at)} ·
                        por {s.generated_by_email ?? "—"}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleView(s)}>
                      <Eye className="h-3.5 w-3.5" /> Visualizar
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDownload(s)}>
                      <Download className="h-3.5 w-3.5" /> Baixar
                    </Button>
                    {role.isAdmin && (
                      <Button variant="destructive" size="sm" onClick={() => handleDelete(s)}>
                        <Trash2 className="h-3.5 w-3.5" /> Excluir
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function computeRange(period: StatementPeriod, anchor: string): { from: string; to: string; title: string } {
  const d = new Date(anchor + "T00:00:00");
  const iso = (x: Date) => x.toISOString().slice(0, 10);
  if (period === "daily") {
    return { from: iso(d), to: iso(d), title: `Extrato Diário — ${formatDate(d)}` };
  }
  if (period === "weekly") {
    const day = d.getDay();
    const diffToMonday = (day + 6) % 7;
    const start = new Date(d);
    start.setDate(d.getDate() - diffToMonday);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return {
      from: iso(start),
      to: iso(end),
      title: `Extrato Semanal — ${formatDate(start)} a ${formatDate(end)}`,
    };
  }
  // monthly: anchor is yyyy-MM, but date input is yyyy-MM-dd; we get first day of that month
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  const mm = `${String(start.getMonth() + 1).padStart(2, "0")}/${start.getFullYear()}`;
  return { from: iso(start), to: iso(end), title: `Extrato Mensal — ${mm}` };
}

function GenerateModal({
  onCreated,
  userId,
  email,
}: {
  onCreated: () => void;
  userId: string;
  email: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [period, setPeriod] = useState<StatementPeriod>("daily");
  const today = new Date().toISOString().slice(0, 10);
  const [anchor, setAnchor] = useState(today);
  const [busy, setBusy] = useState(false);

  const range = useMemo(() => computeRange(period, anchor), [period, anchor]);

  async function doGenerate(force = false) {
    setBusy(true);
    try {
      const summary = await fetchSalesSummary(range.from, range.to);
      if (!force && summary.count === 0) {
        if (!confirm("Nenhum lançamento encontrado para este período. Deseja gerar o extrato mesmo assim?")) {
          setBusy(false);
          return;
        }
      }
      const prev = previousRange(range.from, range.to);
      const prevSummary = await fetchSalesSummary(prev.from, prev.to);
      const variation =
        prevSummary.total > 0
          ? ((summary.total - prevSummary.total) / prevSummary.total) * 100
          : summary.total > 0
            ? 100
            : 0;
      const financial = await fetchFinancialForRange(range.from, range.to);

      const blob = await generateStatementPdf({
        periodType: period,
        startDate: range.from,
        endDate: range.to,
        generatedByName: email ?? "Usuário",
        summary: {
          total: summary.total,
          count: summary.count,
          avg: summary.avg,
          previousTotal: prevSummary.total,
          variationPct: variation,
        },
        salesRows: summary.rows.map((r: any) => ({
          sale_date: r.sale_date,
          amount: Number(r.amount),
          notes: r.notes,
          product_name: r.products?.name ?? r.sales_goals?.title ?? null,
          category: r.sales_goals?.category ?? null,
        })),
        financialRows: financial.map((r: any) => ({
          reference_date: r.reference_date,
          description: r.description,
          type: r.type,
          amount: Number(r.amount),
          category_name: r.financial_categories?.name ?? null,
        })),
      });

      const saved = await uploadStatement({
        pdfBlob: blob,
        title: range.title,
        periodType: period,
        startDate: range.from,
        endDate: range.to,
        userId,
        email,
      });

      // open the PDF
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      toast.success("Extrato gerado com sucesso");
      onCreated();
      setOpen(false);
      void saved;
    } catch (e: any) {
      toast.error(e.message || "Erro ao gerar extrato");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" /> Gerar Novo Extrato
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Gerar Novo Extrato</DialogTitle>
          <DialogDescription>Selecione o tipo de período e a data de referência.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Tipo de período</Label>
            <div className="grid grid-cols-3 gap-2 mt-1">
              {(["daily", "weekly", "monthly"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={cn(
                    "rounded-md border px-3 py-2 text-sm",
                    period === p
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:text-foreground",
                  )}
                >
                  {p === "daily" ? "Diário" : p === "weekly" ? "Semanal" : "Mensal"}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              {period === "monthly" ? "Mês" : period === "weekly" ? "Selecione um dia da semana" : "Dia"}
            </Label>
            {period === "monthly" ? (
              <Input
                type="month"
                value={anchor.slice(0, 7)}
                onChange={(e) => setAnchor(e.target.value + "-01")}
                className="mt-1"
              />
            ) : (
              <Input type="date" value={anchor} onChange={(e) => setAnchor(e.target.value)} className="mt-1" />
            )}
            <p className="text-xs text-muted-foreground mt-2">
              Cobertura: <span className="font-medium text-foreground">{formatDate(range.from)} a {formatDate(range.to)}</span>
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
            Cancelar
          </Button>
          <Button onClick={() => doGenerate(false)} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Gerar e Baixar PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}