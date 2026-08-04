import { test } from "node:test";
import assert from "node:assert/strict";
import { conviteValido, hashToken } from "./convites";
import type { Convite } from "./tipos";

function conviteBase(parcial: Partial<Convite> = {}): Convite {
  return {
    id: "c1",
    usuarioId: "u1",
    hashToken: hashToken("token-de-teste"),
    expiraEm: "2026-08-11T12:00:00Z",
    usadoEm: null,
    ...parcial,
  };
}

test("hashToken e deterministico e sensivel ao valor", () => {
  assert.equal(hashToken("abc"), hashToken("abc"));
  assert.notEqual(hashToken("abc"), hashToken("abd"));
});

test("hashToken nao devolve o texto original", () => {
  // O ponto do hash: mesmo alguem lendo convites.json, nao recupera o token.
  assert.notEqual(hashToken("token-de-teste"), "token-de-teste");
});

test("conviteValido: pendente e dentro do prazo", () => {
  const antesDeExpirar = new Date("2026-08-10T12:00:00Z");
  assert.equal(conviteValido(conviteBase(), antesDeExpirar), true);
});

test("conviteValido: expirado nao vale mais", () => {
  const depoisDeExpirar = new Date("2026-08-12T00:00:00Z");
  assert.equal(conviteValido(conviteBase(), depoisDeExpirar), false);
});

test("conviteValido: ja usado nao vale de novo, mesmo dentro do prazo", () => {
  // O ponto de "uso unico": usar o mesmo link duas vezes nao pode funcionar.
  const usado = conviteBase({ usadoEm: "2026-08-05T12:00:00Z" });
  const antesDeExpirar = new Date("2026-08-10T12:00:00Z");
  assert.equal(conviteValido(usado, antesDeExpirar), false);
});

test("conviteValido: exatamente no instante de expiracao ja nao vale", () => {
  const noLimite = new Date("2026-08-11T12:00:00Z");
  assert.equal(conviteValido(conviteBase(), noLimite), false);
});
