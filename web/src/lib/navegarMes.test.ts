import { describe, it, expect } from "vitest";
import { andarMes } from "./navegarMes";

describe("andarMes", () => {
  it("preserva o ano ao andar dentro dele", () => {
    // A regressao que este teste existe pra impedir: a versao anterior tinha
    // um "% 12000" que transformava agosto/2026 + 1 em setembro/26, e ai o
    // calendario ficava num ano onde nada esta cadastrado.
    expect(andarMes({ ano: 2026, mes: 8 }, 1)).toEqual({ ano: 2026, mes: 9 });
    expect(andarMes({ ano: 2026, mes: 8 }, -1)).toEqual({ ano: 2026, mes: 7 });
  });

  it("vira o ano em dezembro e em janeiro", () => {
    expect(andarMes({ ano: 2026, mes: 12 }, 1)).toEqual({ ano: 2027, mes: 1 });
    expect(andarMes({ ano: 2026, mes: 1 }, -1)).toEqual({ ano: 2025, mes: 12 });
  });

  it("aguenta uma sequencia longa sem deriva", () => {
    // 24 passos pra frente e 24 pra tras tem que voltar exatamente ao inicio.
    let cursor = { ano: 2026, mes: 8 };
    for (let i = 0; i < 24; i++) cursor = andarMes(cursor, 1);
    expect(cursor).toEqual({ ano: 2028, mes: 8 });

    for (let i = 0; i < 24; i++) cursor = andarMes(cursor, -1);
    expect(cursor).toEqual({ ano: 2026, mes: 8 });
  });

  it("o mes fica sempre entre 1 e 12", () => {
    let cursor = { ano: 2026, mes: 1 };
    for (let i = 0; i < 40; i++) {
      cursor = andarMes(cursor, 1);
      expect(cursor.mes).toBeGreaterThanOrEqual(1);
      expect(cursor.mes).toBeLessThanOrEqual(12);
    }
  });
});
