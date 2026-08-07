import { describe, it, expect } from "vitest";
import { ehMeuAtendente, souAdmin } from "./permissoes";
import type { Eu } from "../api/tipos";

function eu(parcial: Partial<Eu>): Eu {
  return { nome: "Teste", papel: "comum", codigoAtendente: 10, ...parcial };
}

describe("souAdmin", () => {
  it("verdadeiro pro papel admin", () => {
    expect(souAdmin(eu({ papel: "admin" }))).toBe(true);
  });

  it("falso pro papel comum e antes de saber quem e", () => {
    expect(souAdmin(eu({ papel: "comum" }))).toBe(false);
    expect(souAdmin(null)).toBe(false);
  });
});

describe("ehMeuAtendente", () => {
  it("verdadeiro quando o codigo bate com o do usuario logado", () => {
    expect(ehMeuAtendente(eu({ codigoAtendente: 10 }), 10)).toBe(true);
  });

  it("falso pra codigo de outro atendente", () => {
    expect(ehMeuAtendente(eu({ codigoAtendente: 10 }), 99)).toBe(false);
  });

  it("falso sem usuario logado ou sem vinculo", () => {
    expect(ehMeuAtendente(null, 10)).toBe(false);
    expect(ehMeuAtendente(eu({ codigoAtendente: null }), null)).toBe(false);
  });
});
