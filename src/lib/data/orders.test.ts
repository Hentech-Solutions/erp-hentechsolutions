import { beforeEach, describe, expect, it, vi } from "vitest";
import { createManualOrder, updateOrderQuote } from "./orders";

const { fromMock, updateMock, eqMock, insertMock, selectMock, singleMock } = vi.hoisted(() => ({
  fromMock: vi.fn(),
  updateMock: vi.fn(),
  eqMock: vi.fn(),
  insertMock: vi.fn(),
  selectMock: vi.fn(),
  singleMock: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: fromMock },
}));
vi.mock("@/lib/data/rpc", () => ({ rpc: vi.fn() }));
vi.mock("@/lib/telegram.functions", () => ({ notifySaleCompleted: vi.fn() }));

describe("updateOrderQuote", () => {
  beforeEach(() => {
    fromMock.mockReset().mockReturnValue({ update: updateMock, insert: insertMock });
    updateMock.mockReset().mockReturnValue({ eq: eqMock });
    eqMock.mockReset().mockResolvedValue({ error: null });
    insertMock.mockReset().mockReturnValue({ select: selectMock });
    selectMock.mockReset().mockReturnValue({ single: singleMock });
    singleMock.mockReset().mockResolvedValue({ data: { id: "order-1" }, error: null });
  });

  it("atribui um identificador textual ao orçamento fora do catálogo", async () => {
    await updateOrderQuote("order-1", {
      planRefId: null,
      planId: null,
      planName: "  Serviço personalizado  ",
      planPrice: 1200,
      addQuantity: 2,
      addUnitPrice: 50,
    });

    expect(fromMock).toHaveBeenCalledWith("orders");
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        plan_id: "custom:Serviço personalizado",
        plan_name: "Serviço personalizado",
        plan_price: 1200,
        add_subtotal: 100,
        total: 1300,
      }),
    );
    expect(eqMock).toHaveBeenCalledWith("id", "order-1");
  });

  it("não grava orçamento sem descrição", async () => {
    await expect(
      updateOrderQuote("order-1", {
        planRefId: null,
        planId: null,
        planName: "   ",
        planPrice: 100,
        addQuantity: 0,
        addUnitPrice: 0,
      }),
    ).rejects.toThrow("Informe a descrição do serviço.");
    expect(updateMock).not.toHaveBeenCalled();
  });
});

describe("createManualOrder", () => {
  beforeEach(() => {
    fromMock.mockReset().mockReturnValue({ insert: insertMock, update: updateMock });
    insertMock.mockReset().mockReturnValue({ select: selectMock });
    selectMock.mockReset().mockReturnValue({ single: singleMock });
    singleMock.mockReset().mockResolvedValue({ data: { id: "order-1" }, error: null });
    vi.stubGlobal("crypto", { randomUUID: () => "12345678-1234-4234-8234-123456789abc" });
  });

  it("persiste um pedido manual precificado e valida seus campos", async () => {
    await createManualOrder({
      customerName: "  Ana Silva ",
      customerWhatsapp: "(11) 99999-8888",
      customerEmail: " ana@example.com ",
      customerCompany: " Empresa ",
      serviceName: " Site institucional ",
      amount: 1500,
      orderDate: "2026-10-20",
      notes: "  Indicação  ",
    });

    expect(fromMock).toHaveBeenCalledWith("orders");
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        code: "MAN-12345678",
        customer_name: "Ana Silva",
        customer_whatsapp: "(11) 99999-8888",
        customer_email: "ana@example.com",
        customer_company: "Empresa",
        plan_name: "Site institucional",
        plan_id: "custom:Site institucional",
        plan_price: 1500,
        total: 1500,
        origin: "manual",
        status: "pendente",
        notes: "Indicação",
        raw_payload: { source: "erp_manual" },
      }),
    );
    expect(selectMock).toHaveBeenCalledWith("*");
    expect(singleMock).toHaveBeenCalledOnce();
  });

  it("rejeita dados inválidos sem gravar pedido", async () => {
    await expect(
      createManualOrder({
        customerName: "Ana",
        customerWhatsapp: "123",
        serviceName: "Site",
        amount: 0,
        orderDate: "2026-02-30",
      }),
    ).rejects.toThrow("Informe um telefone válido com DDD.");
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("rejeita valor inválido e data inexistente", async () => {
    const input = {
      customerName: "Ana Silva",
      customerWhatsapp: "(11) 99999-8888",
      serviceName: "Site institucional",
      amount: Number.NaN,
      orderDate: "2026-02-30",
    };
    await expect(createManualOrder(input)).rejects.toThrow("Informe um valor maior que zero.");
    expect(insertMock).not.toHaveBeenCalled();

    await expect(createManualOrder({ ...input, amount: 1500 })).rejects.toThrow(
      "Informe uma data válida para o pedido.",
    );
    expect(insertMock).not.toHaveBeenCalled();
  });
});
