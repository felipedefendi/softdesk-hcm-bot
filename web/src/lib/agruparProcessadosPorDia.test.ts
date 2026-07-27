import { test, expect } from "vitest";
import { agruparProcessadosPorDia } from "./agruparProcessadosPorDia";
import type { Execucao } from "../api/tipos";

const HOJE = "2026-07-27";

function execucao(parcial: Partial<Execucao>): Execucao {
  return { inicio: "2026-07-27T10:00:00.000Z", duracaoMs: 1000, processados: 0, erro: null, ...parcial };
}

test("devolve N dias terminando hoje", () => {
  const resultado = agruparProcessadosPorDia([], HOJE, 5);
  expect(resultado.map((d) => d.dia)).toEqual(["2026-07-23", "2026-07-24", "2026-07-25", "2026-07-26", "2026-07-27"]);
});

test("dias sem execucao ficam com zero", () => {
  const resultado = agruparProcessadosPorDia([], HOJE, 3);
  expect(resultado.every((d) => d.total === 0)).toBe(true);
});

test("soma processados de varias execucoes no mesmo dia", () => {
  const execucoes = [
    execucao({ inicio: "2026-07-27T08:00:00.000Z", processados: 2 }),
    execucao({ inicio: "2026-07-27T14:00:00.000Z", processados: 3 }),
  ];
  const resultado = agruparProcessadosPorDia(execucoes, HOJE, 1);
  expect(resultado).toEqual([{ dia: "2026-07-27", total: 5 }]);
});

test("execucao fora da janela de dias nao entra", () => {
  const execucoes = [execucao({ inicio: "2026-07-01T08:00:00.000Z", processados: 10 })];
  const resultado = agruparProcessadosPorDia(execucoes, HOJE, 3);
  expect(resultado.reduce((soma, d) => soma + d.total, 0)).toBe(0);
});

test("execucao com erro (0 processados) nao contribui", () => {
  const execucoes = [execucao({ inicio: "2026-07-27T08:00:00.000Z", processados: 0, erro: "falhou" })];
  const resultado = agruparProcessadosPorDia(execucoes, HOJE, 1);
  expect(resultado[0].total).toBe(0);
});
