import { test, expect } from "vitest";
import { filtrarHistorico } from "./filtrarHistorico";
import type { EntradaLog } from "../api/tipos";

function entrada(parcial: Partial<EntradaLog>): EntradaLog {
  return {
    linhaOriginal: "linha",
    horario: "15/07/2026, 11:42:11",
    chamado: 123,
    clienteETitulo: "Cliente X - Problema Y",
    atendente: "Ana",
    ...parcial,
  };
}

test("sem busca e sem periodo devolve tudo", () => {
  const entradas = [entrada({ chamado: 1 }), entrada({ chamado: 2 })];
  expect(filtrarHistorico(entradas, { busca: "", desde: null, ate: null })).toHaveLength(2);
});

test("busca pelo numero do chamado", () => {
  const entradas = [entrada({ chamado: 95421 }), entrada({ chamado: 111 })];
  const resultado = filtrarHistorico(entradas, { busca: "95421", desde: null, ate: null });
  expect(resultado).toHaveLength(1);
  expect(resultado[0].chamado).toBe(95421);
});

test("busca por cliente/titulo, case-insensitive", () => {
  const entradas = [entrada({ clienteETitulo: "BOA COMPRA - Ferias" }), entrada({ clienteETitulo: "Outra Empresa" })];
  const resultado = filtrarHistorico(entradas, { busca: "boa compra", desde: null, ate: null });
  expect(resultado).toHaveLength(1);
});

test("busca por atendente", () => {
  const entradas = [entrada({ atendente: "Mateus Ricardo" }), entrada({ atendente: "Felipe Prado" })];
  const resultado = filtrarHistorico(entradas, { busca: "felipe", desde: null, ate: null });
  expect(resultado.map((e) => e.atendente)).toEqual(["Felipe Prado"]);
});

test("busca sem match devolve lista vazia", () => {
  const entradas = [entrada({})];
  expect(filtrarHistorico(entradas, { busca: "nao existe", desde: null, ate: null })).toEqual([]);
});

test("filtro desde exclui entradas anteriores", () => {
  const entradas = [entrada({ chamado: 1, horario: "10/07/2026, 09:00:00" }), entrada({ chamado: 2, horario: "20/07/2026, 09:00:00" })];
  const resultado = filtrarHistorico(entradas, { busca: "", desde: "2026-07-15", ate: null });
  expect(resultado.map((e) => e.chamado)).toEqual([2]);
});

test("filtro ate exclui entradas posteriores", () => {
  const entradas = [entrada({ chamado: 1, horario: "10/07/2026, 09:00:00" }), entrada({ chamado: 2, horario: "20/07/2026, 09:00:00" })];
  const resultado = filtrarHistorico(entradas, { busca: "", desde: null, ate: "2026-07-15" });
  expect(resultado.map((e) => e.chamado)).toEqual([1]);
});

test("desde e ate juntos formam um intervalo fechado", () => {
  const entradas = [
    entrada({ chamado: 1, horario: "01/07/2026, 09:00:00" }),
    entrada({ chamado: 2, horario: "15/07/2026, 09:00:00" }),
    entrada({ chamado: 3, horario: "30/07/2026, 09:00:00" }),
  ];
  const resultado = filtrarHistorico(entradas, { busca: "", desde: "2026-07-10", ate: "2026-07-20" });
  expect(resultado.map((e) => e.chamado)).toEqual([2]);
});

test("entrada malformada (sem chamado/horario) some quando ha filtro de periodo", () => {
  const entradas = [entrada({ chamado: null, horario: null, linhaOriginal: "linha corrompida" })];
  expect(filtrarHistorico(entradas, { busca: "", desde: "2026-07-01", ate: null })).toEqual([]);
});

test("entrada malformada aparece na busca por texto via linhaOriginal", () => {
  const entradas = [entrada({ chamado: null, horario: null, clienteETitulo: null, atendente: null, linhaOriginal: "algo estranho aconteceu" })];
  const resultado = filtrarHistorico(entradas, { busca: "estranho", desde: null, ate: null });
  expect(resultado).toHaveLength(1);
});

test("busca e periodo combinados", () => {
  const entradas = [
    entrada({ chamado: 1, atendente: "Ana", horario: "01/07/2026, 09:00:00" }),
    entrada({ chamado: 2, atendente: "Ana", horario: "20/07/2026, 09:00:00" }),
    entrada({ chamado: 3, atendente: "Bruno", horario: "20/07/2026, 09:00:00" }),
  ];
  const resultado = filtrarHistorico(entradas, { busca: "ana", desde: "2026-07-10", ate: null });
  expect(resultado.map((e) => e.chamado)).toEqual([2]);
});
