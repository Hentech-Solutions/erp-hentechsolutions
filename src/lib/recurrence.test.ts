import { describe, expect, it } from "vitest";
import { generateRecurrenceDates } from "./recurrence";

describe("generateRecurrenceDates", () => {
  it("nao expande lancamento avulso", () => {
    expect(generateRecurrenceDates("2026-03-15", "one_time")).toEqual(["2026-03-15"]);
  });

  it("gera parcelas mensais no mesmo dia", () => {
    expect(generateRecurrenceDates("2026-01-10", "monthly", 4)).toEqual([
      "2026-01-10",
      "2026-02-10",
      "2026-03-10",
      "2026-04-10",
    ]);
  });

  // regressao: setMonth transbordava e 31/jan virava 03/mar, entao a despesa
  // recorrente do dia 31 escorregava alguns dias a cada parcela
  it("grampeia no ultimo dia quando o mes destino e mais curto", () => {
    expect(generateRecurrenceDates("2026-01-31", "monthly", 5)).toEqual([
      "2026-01-31",
      "2026-02-28",
      "2026-03-31",
      "2026-04-30",
      "2026-05-31",
    ]);
  });

  it("respeita ano bissexto", () => {
    expect(generateRecurrenceDates("2028-01-31", "monthly", 2)).toEqual([
      "2028-01-31",
      "2028-02-29",
    ]);
  });

  it("atravessa a virada de ano", () => {
    expect(generateRecurrenceDates("2026-11-30", "monthly", 3)).toEqual([
      "2026-11-30",
      "2026-12-30",
      "2027-01-30",
    ]);
  });

  it("gera parcelas trimestrais", () => {
    expect(generateRecurrenceDates("2026-01-15", "quarterly", 4)).toEqual([
      "2026-01-15",
      "2026-04-15",
      "2026-07-15",
      "2026-10-15",
    ]);
  });

  it("gera parcelas anuais", () => {
    expect(generateRecurrenceDates("2026-06-01", "annual", 3)).toEqual([
      "2026-06-01",
      "2027-06-01",
      "2028-06-01",
    ]);
  });

  // regressao: a versao antiga usava toISOString() sobre uma data local, o que
  // em fuso negativo (Brasil) devolvia o dia anterior
  it("nao desloca a data por fuso horario", () => {
    const [first] = generateRecurrenceDates("2026-03-01", "monthly", 1);
    expect(first).toBe("2026-03-01");
  });
});
