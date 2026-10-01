/* eslint-disable prettier/prettier */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { updateOrderQuote } from "./orders";

const { fromMock, updateMock, eqMock } = vi.hoisted(() => ({
  fromMock: vi.fn(),
  updateMock: vi.fn(),
  eqMock: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: fromMock },
}));
vi.mock("@/lib/data/rpc", () => ({ rpc: vi.fn() }));
vi.mock("@/lib/telegram.functions", () => ({ notifySaleCompleted: vi.fn() }));

describe("updateOrderQuote", () => {
  beforeEach(() => {
    fromMock.mockReset().mockReturnValue({ update: updateMock });
    updateMock.mockReset().mockReturnValue({ eq: eqMock });
    eqMock.mockReset().mockResolvedValue({ error: null });
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