import { test, expect } from "vitest";
import { infoValidade, compararPorValidade } from "./diasParaVencer";

const HOJE = "2026-07-27";

test("sem validade cadastrada", () => {
  expect(infoValidade(null, HOJE)).toEqual({ status: "sem-data", dias: null });
});

test("validade no passado esta vencida", () => {
  expect(infoValidade("2026-07-20", HOJE)).toEqual({ status: "vencida", dias: -7 });
});

test("validade hoje conta como proxima (0 dias)", () => {
  expect(infoValidade(HOJE, HOJE)).toEqual({ status: "proxima", dias: 0 });
});

test("limite de 30 dias ainda e proxima", () => {
  expect(infoValidade("2026-08-26", HOJE)).toEqual({ status: "proxima", dias: 30 });
});

test("31 dias ja e ok", () => {
  expect(infoValidade("2026-08-27", HOJE)).toEqual({ status: "ok", dias: 31 });
});

test("compararPorValidade: vencida vem antes de proxima", () => {
  expect(compararPorValidade("2026-07-20", "2026-08-01", HOJE)).toBeLessThan(0);
});

test("compararPorValidade: proxima vem antes de ok", () => {
  expect(compararPorValidade("2026-08-01", "2026-12-01", HOJE)).toBeLessThan(0);
});

test("compararPorValidade: ok vem antes de sem-data", () => {
  expect(compararPorValidade("2026-12-01", null, HOJE)).toBeLessThan(0);
});

test("compararPorValidade: dentro do mesmo status, mais urgente primeiro", () => {
  expect(compararPorValidade("2026-08-10", "2026-08-01", HOJE)).toBeGreaterThan(0);
});

test("compararPorValidade: duas sem data empatam", () => {
  expect(compararPorValidade(null, null, HOJE)).toBe(0);
});
