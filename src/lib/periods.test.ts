import { describe, expect, it } from "vitest";
import { previousPeriod, type Period } from "./periods";

const p = (from: string, to: string): Period => ({ from, to, label: "" });

describe("previousPeriod", () => {
  it("espelha um mes cheio no mes anterior", () => {
    const prev = previousPeriod(p("2026-03-01", "2026-03-31"));
    expect(prev.to).toBe("2026-02-28");
    expect(prev.from).toBe("2026-01-29");
  });

  it("mantem a mesma duracao do periodo original", () => {
    const days = (a: string, b: string) =>
      Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);
    const orig = p("2026-05-01", "2026-05-07");
    const prev = previousPeriod(orig);
    expect(days(prev.from, prev.to)).toBe(days(orig.from, orig.to));
  });

  it("termina exatamente um dia antes do inicio do periodo atual", () => {
    const prev = previousPeriod(p("2026-08-01", "2026-08-31"));
    expect(prev.to).toBe("2026-07-31");
  });

  it("nao quebra em periodo de um unico dia", () => {
    const prev = previousPeriod(p("2026-08-07", "2026-08-07"));
    expect(prev.from).toBe("2026-08-06");
    expect(prev.to).toBe("2026-08-06");
  });
});
