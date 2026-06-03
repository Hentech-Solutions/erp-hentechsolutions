import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import brandLogo from "@/assets/brand-logo.png";
import brandWatermark from "@/assets/brand-watermark.png";
import { formatBRL, formatDate } from "@/lib/formatters";

async function urlToDataUrl(url: string): Promise<string> {
  const res = await fetch(url);
  const blob = await res.blob();
  return await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

const PERIOD_LABEL: Record<string, string> = {
  daily: "Diário",
  weekly: "Semanal",
  monthly: "Mensal",
};

export type GenerateStatementInput = {
  periodType: "daily" | "weekly" | "monthly";
  startDate: string;
  endDate: string;
  generatedByName: string;
  companyName?: string;
  summary: {
    total: number;
    count: number;
    avg: number;
    previousTotal: number;
    variationPct: number;
  };
  salesRows: Array<{
    sale_date: string;
    amount: number;
    notes: string | null;
    product_name: string | null;
    category: string | null;
  }>;
  financialRows: Array<{
    reference_date: string;
    description: string | null;
    type: "revenue" | "expense" | string;
    amount: number;
    category_name?: string | null;
  }>;
};

export async function generateStatementPdf(input: GenerateStatementInput): Promise<Blob> {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const companyName = input.companyName ?? "Hentech Solutions";

  const [logoData, watermarkData] = await Promise.all([
    urlToDataUrl(brandLogo),
    urlToDataUrl(brandWatermark),
  ]);

  const drawWatermark = () => {
    const w = 360;
    const h = 360;
    const x = (pageW - w) / 2;
    const y = (pageH - h) / 2;
    const anyDoc = doc as any;
    if (anyDoc.GState) {
      anyDoc.saveGraphicsState();
      anyDoc.setGState(new anyDoc.GState({ opacity: 0.08 }));
      doc.addImage(watermarkData, "PNG", x, y, w, h);
      anyDoc.restoreGraphicsState();
    } else {
      doc.addImage(watermarkData, "PNG", x, y, w, h);
    }
  };

  const drawHeader = () => {
    drawWatermark();
    // Logo
    doc.addImage(logoData, "PNG", 40, 30, 90, 36);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(20, 20, 20);
    doc.text(`Extrato Financeiro — ${PERIOD_LABEL[input.periodType]}`, 140, 50);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    doc.text(`Período: ${formatDate(input.startDate)} a ${formatDate(input.endDate)}`, 140, 66);
    const now = new Date();
    doc.text(`Emitido em: ${formatDate(now)} ${now.toLocaleTimeString("pt-BR")}`, 140, 80);
    doc.text(`Gerado por: ${input.generatedByName}`, 140, 94);
    doc.setDrawColor(200, 200, 200);
    doc.line(40, 110, pageW - 40, 110);
  };

  const drawFooter = () => {
    const pageCount = (doc.internal as any).getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      const ts = new Date().toLocaleString("pt-BR");
      doc.text(`Documento gerado automaticamente em ${ts}`, 40, pageH - 24);
      doc.text(companyName, pageW / 2, pageH - 24, { align: "center" });
      doc.text(`Página ${i} de ${pageCount}`, pageW - 40, pageH - 24, { align: "right" });
    }
  };

  // First page header
  drawHeader();

  // Section 1: Resumo
  let y = 130;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(20, 20, 20);
  doc.text("Resumo Financeiro", 40, y);
  y += 8;
  doc.setDrawColor(230, 230, 230);
  doc.line(40, y, pageW - 40, y);
  y += 16;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const lines = [
    [`Total de vendas no período`, formatBRL(input.summary.total)],
    [`Número de lançamentos`, String(input.summary.count)],
    [`Ticket médio`, formatBRL(input.summary.avg)],
    [
      `Comparativo período anterior`,
      `${formatBRL(input.summary.previousTotal)} (${input.summary.variationPct >= 0 ? "+" : ""}${input.summary.variationPct.toFixed(1)}%)`,
    ],
  ];
  lines.forEach(([k, v]) => {
    doc.setTextColor(100, 100, 100);
    doc.text(String(k), 50, y);
    doc.setTextColor(20, 20, 20);
    doc.text(String(v), pageW - 50, y, { align: "right" });
    y += 16;
  });

  // Section 2: Lançamentos de Venda
  y += 8;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Lançamentos de Venda", 40, y);

  const salesBody = input.salesRows.map((r) => [
    formatDate(r.sale_date),
    r.product_name ?? "—",
    r.category ?? "—",
    formatBRL(Number(r.amount)),
    r.notes ?? "",
  ]);
  const salesTotal = input.salesRows.reduce((s, r) => s + Number(r.amount ?? 0), 0);
  salesBody.push([
    { content: "Total", colSpan: 3, styles: { halign: "right", fontStyle: "bold" } } as any,
    { content: formatBRL(salesTotal), styles: { fontStyle: "bold" } } as any,
    "",
  ]);

  autoTable(doc, {
    startY: y + 6,
    head: [["Data", "Produto", "Categoria", "Valor", "Observação"]],
    body: salesBody.length > 1 ? salesBody : [["—", "—", "—", "—", "Nenhum lançamento no período"]],
    styles: { fontSize: 9, cellPadding: 6 },
    headStyles: { fillColor: [30, 41, 59], textColor: 255 },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    margin: { left: 40, right: 40 },
    didDrawPage: () => {
      // Redraw header+watermark for each new page
      drawHeader();
    },
  });

  // Section 3: Dados Financeiros Complementares
  let afterY = (doc as any).lastAutoTable?.finalY ?? y + 40;
  if (afterY > pageH - 200) {
    doc.addPage();
    drawHeader();
    afterY = 130;
  }
  afterY += 24;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(20, 20, 20);
  doc.text("Dados Financeiros Complementares", 40, afterY);

  const finBody = input.financialRows.map((r) => [
    formatDate(r.reference_date),
    r.description ?? r.category_name ?? "—",
    r.type === "revenue" ? "Entrada" : r.type === "expense" ? "Saída" : r.type,
    formatBRL(Number(r.amount)),
  ]);
  const totalIn = input.financialRows
    .filter((r) => r.type === "revenue")
    .reduce((s, r) => s + Number(r.amount ?? 0), 0);
  const totalOut = input.financialRows
    .filter((r) => r.type === "expense")
    .reduce((s, r) => s + Number(r.amount ?? 0), 0);

  autoTable(doc, {
    startY: afterY + 6,
    head: [["Data", "Descrição", "Tipo", "Valor"]],
    body: finBody.length > 0 ? finBody : [["—", "Nenhum lançamento no período", "—", "—"]],
    foot: [
      [
        { content: "Subtotal entradas", colSpan: 3, styles: { halign: "right" } } as any,
        formatBRL(totalIn),
      ],
      [
        { content: "Subtotal saídas", colSpan: 3, styles: { halign: "right" } } as any,
        formatBRL(totalOut),
      ],
      [
        { content: "Saldo do período", colSpan: 3, styles: { halign: "right", fontStyle: "bold" } } as any,
        { content: formatBRL(totalIn - totalOut), styles: { fontStyle: "bold" } } as any,
      ],
    ],
    styles: { fontSize: 9, cellPadding: 6 },
    headStyles: { fillColor: [30, 41, 59], textColor: 255 },
    footStyles: { fillColor: [240, 240, 245], textColor: 20 },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    margin: { left: 40, right: 40 },
    didDrawPage: () => {
      drawHeader();
    },
  });

  drawFooter();
  return doc.output("blob");
}