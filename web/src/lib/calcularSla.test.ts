import { test, expect } from "vitest";
import { situacaoSla, formatarDuracaoMinutos } from "./calcularSla";

const CONSULTADO_EM = new Date("2026-07-27T12:00:00.000Z");

test("situacaoSla: dentro do limite, sem tempo passado desde a consulta", () => {
  const r = situacaoSla(5, 15, CONSULTADO_EM, CONSULTADO_EM);
  expect(r).toEqual({ status: "dentro", minutosRestantes: 10 });
});

test("situacaoSla: exatamente no limite conta como estourado", () => {
  const r = situacaoSla(15, 15, CONSULTADO_EM, CONSULTADO_EM);
  expect(r.status).toBe("estourado");
  expect(r.minutosRestantes).toBe(0);
});

test("situacaoSla: passou do limite", () => {
  const r = situacaoSla(20, 15, CONSULTADO_EM, CONSULTADO_EM);
  expect(r.status).toBe("estourado");
  expect(r.minutosRestantes).toBe(-5);
});

test("situacaoSla: soma o tempo real decorrido desde a consulta", () => {
  const agora = new Date(CONSULTADO_EM.getTime() + 3 * 60_000);
  const r = situacaoSla(5, 15, CONSULTADO_EM, agora);
  expect(r.minutosRestantes).toBe(7);
});

test("situacaoSla: contagem regressiva pode virar estourado so com o tempo passando", () => {
  const agora = new Date(CONSULTADO_EM.getTime() + 11 * 60_000);
  const r = situacaoSla(5, 15, CONSULTADO_EM, agora);
  expect(r.status).toBe("estourado");
  expect(r.minutosRestantes).toBe(-1);
});

test("formatarDuracaoMinutos: menos de uma hora", () => {
  expect(formatarDuracaoMinutos(12)).toBe("12min");
});

test("formatarDuracaoMinutos: horas e minutos", () => {
  expect(formatarDuracaoMinutos(65)).toBe("1h 05min");
});

test("formatarDuracaoMinutos: negativo mantem o sinal", () => {
  expect(formatarDuracaoMinutos(-3)).toBe("-3min");
});

test("formatarDuracaoMinutos: zero", () => {
  expect(formatarDuracaoMinutos(0)).toBe("0min");
});

test("formatarDuracaoMinutos: arredonda fracoes de minuto", () => {
  expect(formatarDuracaoMinutos(4.6)).toBe("5min");
});
