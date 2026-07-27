import { test, expect } from "vitest";
import { estaAtrasada, truncar } from "./saudeBot";

const AGORA = new Date("2026-07-27T12:00:00.000Z");

test("estaAtrasada: sem ultima execucao, nao alarma", () => {
  expect(estaAtrasada(null, 5, AGORA)).toBe(false);
});

test("estaAtrasada: dentro de 2x o intervalo", () => {
  const ultimaExecucao = new Date(AGORA.getTime() - 9 * 60_000).toISOString();
  expect(estaAtrasada(ultimaExecucao, 5, AGORA)).toBe(false);
});

test("estaAtrasada: exatamente 2x o intervalo ainda nao alarma", () => {
  const ultimaExecucao = new Date(AGORA.getTime() - 10 * 60_000).toISOString();
  expect(estaAtrasada(ultimaExecucao, 5, AGORA)).toBe(false);
});

test("estaAtrasada: passou de 2x o intervalo", () => {
  const ultimaExecucao = new Date(AGORA.getTime() - 11 * 60_000).toISOString();
  expect(estaAtrasada(ultimaExecucao, 5, AGORA)).toBe(true);
});

test("truncar: texto dentro do limite volta intacto", () => {
  expect(truncar("erro curto", 80)).toBe("erro curto");
});

test("truncar: corta e adiciona reticencias quando passa do limite", () => {
  const texto = "a".repeat(100);
  const resultado = truncar(texto, 80);
  expect(resultado).toHaveLength(81);
  expect(resultado.endsWith("…")).toBe(true);
});

test("truncar: nao deixa espaco solto antes das reticencias", () => {
  const texto = "0123456789 abc";
  expect(truncar(texto, 11)).toBe("0123456789…");
});
