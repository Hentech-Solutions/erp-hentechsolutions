/* eslint-disable prettier/prettier */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { rpc } from "./rpc";

const { restRpc } = vi.hoisted(() => ({ restRpc: vi.fn() }));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rest: { rpc: restRpc },
    rpc(fn: string, args: Record<string, unknown>) {
      return this.rest.rpc(fn, args);
    },
  },
}));

describe("rpc", () => {
  beforeEach(() => restRpc.mockReset());

  it("preserva o contexto do cliente Supabase ao invocar a RPC", async () => {
    restRpc.mockResolvedValue({ data: { status: "pago" }, error: null });

    await expect(rpc("set_order_payment", { _status: "pago" })).resolves.toEqual({
      status: "pago",
    });
    expect(restRpc).toHaveBeenCalledWith("set_order_payment", { _status: "pago" });
  });

  it("propaga erros retornados pela RPC", async () => {
    restRpc.mockResolvedValue({ data: null, error: { message: "falha" } });

    await expect(rpc("set_order_payment")).rejects.toThrow("set_order_payment: falha");
  });
});