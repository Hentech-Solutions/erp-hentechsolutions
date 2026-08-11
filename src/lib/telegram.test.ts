import { describe, expect, it } from "vitest";
import { buildNotificationText, NOTIFY_COLUMN, type NotifyKind } from "./telegram.server";

describe("NOTIFY_COLUMN", () => {
  it("da a lead um interruptor proprio, separado de novo pedido", () => {
    expect(NOTIFY_COLUMN.new_lead).toBe("notify_new_lead");
    expect(NOTIFY_COLUMN.new_lead).not.toBe(NOTIFY_COLUMN.new_order);
  });

  it("nao repete coluna entre tipos: switch compartilhado desliga dois avisos de uma vez", () => {
    const colunas = Object.values(NOTIFY_COLUMN);
    expect(new Set(colunas).size).toBe(colunas.length);
  });

  it("cobre todos os tipos de aviso", () => {
    const kinds: NotifyKind[] = ["new_order", "sale", "new_lead"];
    for (const k of kinds) expect(NOTIFY_COLUMN[k]).toBeTruthy();
  });
});

describe("buildNotificationText", () => {
  it("avisa que o lead pediu orcamento, com o primeiro nome", () => {
    expect(buildNotificationText("new_lead", null, "Maria")).toBe(
      "📝 Maria solicitou um orçamento",
    );
  });

  it("nao cita valor no lead: ele chega sem orcamento e 'R$ 0,00' afirmaria preco zero", () => {
    const texto = buildNotificationText("new_lead", null, "Maria");
    expect(texto).not.toMatch(/R\$/);
    expect(texto).not.toMatch(/0,00/);
  });

  it("ignora valor passado por engano num lead", () => {
    expect(buildNotificationText("new_lead", 1234, "Joao")).toBe("📝 Joao solicitou um orçamento");
  });

  it("mantem a mensagem de pedido novo com o valor formatado em BRL", () => {
    const texto = buildNotificationText("new_order", 1500, "Ana");
    expect(texto).toContain("Ana");
    expect(texto).toMatch(/1\.500,00/);
  });

  it("trata valor nulo em pedido e venda como zero, sem quebrar a formatacao", () => {
    expect(buildNotificationText("new_order", null, "Ana")).toMatch(/0,00/);
    expect(buildNotificationText("sale", null, "Ana")).toMatch(/0,00/);
  });

  it("mensagem de venda nao depende do nome", () => {
    expect(buildNotificationText("sale", 900, "Ana")).toBe(
      buildNotificationText("sale", 900, "Carlos"),
    );
  });
});
