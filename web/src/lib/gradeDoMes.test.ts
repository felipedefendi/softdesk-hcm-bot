import { describe, it, expect } from "vitest";
import { gradeDoMes, resumoDoDia } from "./gradeDoMes";
import type { DiaEspecial, Ferias } from "../api/tipos";

// Agosto/2026 comeca num sabado, entao a primeira semana leva 6 dias de julho -
// e o mes que mais estica a grade, bom pra conferir o preenchimento.

const NATAL: DiaEspecial = { data: "2026-12-25", tipo: "bloqueado", motivo: "Natal" };
const VESPERA: DiaEspecial = { data: "2026-12-24", tipo: "janela", inicio: "08:00", fim: "12:00", motivo: "Véspera" };

const FERIAS_ANA: Ferias = { id: "a", atendente: "Ana", inicio: "2026-08-10", fim: "2026-08-14" };
const FERIAS_BRUNO: Ferias = { id: "b", atendente: "Bruno", inicio: "2026-08-12", fim: "2026-08-20" };

describe("gradeDoMes", () => {
  it("comeca no domingo e fecha semanas inteiras", () => {
    const semanas = gradeDoMes(2026, 8, [], []);

    for (const semana of semanas) expect(semana).toHaveLength(7);
    expect(semanas[0][0].data).toBe("2026-07-26"); // domingo antes de 01/08
    expect(semanas[0][6].data).toBe("2026-08-01"); // sabado, primeiro do mes
  });

  it("marca o que e do mes e o que e preenchimento", () => {
    const celulas = gradeDoMes(2026, 8, [], []).flat();

    expect(celulas.filter((c) => c.doMes)).toHaveLength(31);
    expect(celulas.find((c) => c.data === "2026-07-31")?.doMes).toBe(false);
    expect(celulas.find((c) => c.data === "2026-08-01")?.doMes).toBe(true);
  });

  it("todo dia do mes aparece exatamente uma vez", () => {
    for (const mes of [1, 2, 4, 8, 12]) {
      const doMes = gradeDoMes(2027, mes, [], [])
        .flat()
        .filter((c) => c.doMes)
        .map((c) => c.data);

      expect(new Set(doMes).size).toBe(doMes.length);
      expect(doMes).toEqual([...doMes].sort());
    }
  });

  it("acerta fevereiro de ano bissexto", () => {
    const doMes = gradeDoMes(2028, 2, [], [])
      .flat()
      .filter((c) => c.doMes);

    expect(doMes).toHaveLength(29);
    expect(doMes[28].data).toBe("2028-02-29");
  });

  it("marca fim de semana", () => {
    const celulas = gradeDoMes(2026, 8, [], []).flat();

    expect(celulas.find((c) => c.data === "2026-08-01")?.fimDeSemana).toBe(true); // sabado
    expect(celulas.find((c) => c.data === "2026-08-02")?.fimDeSemana).toBe(true); // domingo
    expect(celulas.find((c) => c.data === "2026-08-03")?.fimDeSemana).toBe(false); // segunda
  });

  it("gruda o dia especial na celula certa", () => {
    const celulas = gradeDoMes(2026, 12, [NATAL, VESPERA], []).flat();

    expect(celulas.find((c) => c.data === "2026-12-25")?.especial).toEqual(NATAL);
    expect(celulas.find((c) => c.data === "2026-12-24")?.especial).toEqual(VESPERA);
    expect(celulas.find((c) => c.data === "2026-12-23")?.especial).toBeNull();
  });

  it("acumula quem esta de ferias, incluindo as bordas", () => {
    const celulas = gradeDoMes(2026, 8, [], [FERIAS_ANA, FERIAS_BRUNO]).flat();
    const nomesEm = (data: string) => celulas.find((c) => c.data === data)?.ferias.map((f) => f.atendente);

    expect(nomesEm("2026-08-09")).toEqual([]);
    expect(nomesEm("2026-08-10")).toEqual(["Ana"]); // primeiro dia da Ana
    expect(nomesEm("2026-08-12")).toEqual(["Ana", "Bruno"]); // sobreposicao
    expect(nomesEm("2026-08-14")).toEqual(["Ana", "Bruno"]); // ultimo dia da Ana
    expect(nomesEm("2026-08-15")).toEqual(["Bruno"]);
    expect(nomesEm("2026-08-21")).toEqual([]);
  });

  it("ferias tambem aparecem nos dias de preenchimento", () => {
    // Sem isso, quem entra de ferias no fim do mes anterior sumiria da primeira
    // semana e a tela mentiria sobre a virada.
    const viradaDeJulho: Ferias = { id: "c", atendente: "Ana", inicio: "2026-07-27", fim: "2026-08-03" };
    const celulas = gradeDoMes(2026, 8, [], [viradaDeJulho]).flat();

    expect(celulas.find((c) => c.data === "2026-07-28")?.ferias).toHaveLength(1);
  });
});

describe("resumoDoDia", () => {
  const base = { data: "2026-12-25", dia: 25, doMes: true, fimDeSemana: false, ferias: [] };

  it("descreve bloqueio, janela e dia normal", () => {
    expect(resumoDoDia({ ...base, especial: NATAL })).toBe("Sem expediente");
    expect(resumoDoDia({ ...base, especial: VESPERA })).toBe("08:00–12:00");
    expect(resumoDoDia({ ...base, especial: null })).toBeNull();
  });
});
