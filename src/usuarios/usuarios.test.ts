import { test } from "node:test";
import assert from "node:assert/strict";
import { contarAdminsAtivos, emailValido, normalizarEmail, usuarioComCodigoAtendente } from "./usuarios";
import type { Usuario } from "./tipos";

function usuarioBase(parcial: Partial<Usuario> = {}): Usuario {
  return {
    id: "u1",
    nome: "Teste",
    email: "teste@example.com",
    papel: "comum",
    codigoAtendente: 10,
    ativo: true,
    criadoEm: new Date().toISOString(),
    ...parcial,
  };
}

test("normalizarEmail e emailValido", () => {
  assert.equal(normalizarEmail("  Felipe.Prado@Empresa.com.br  "), "felipe.prado@empresa.com.br");
  assert.equal(emailValido("felipe.prado@empresa.com.br"), true);
  assert.equal(emailValido("nao-e-email"), false);
  assert.equal(emailValido("falta-arroba.com"), false);
});

test("contarAdminsAtivos ignora comum e admin inativo", () => {
  const lista = [
    usuarioBase({ id: "a", papel: "admin", ativo: true }),
    usuarioBase({ id: "b", papel: "admin", ativo: false }),
    usuarioBase({ id: "c", papel: "comum", ativo: true }),
  ];
  assert.equal(contarAdminsAtivos(lista), 1);
});

test("contarAdminsAtivos com lista vazia da zero", () => {
  assert.equal(contarAdminsAtivos([]), 0);
});

test("usuarioComCodigoAtendente encontra conflito e ignora a conta editada", () => {
  const usuarios = [
    usuarioBase({ id: "a", codigoAtendente: 10 }),
    usuarioBase({ id: "b", codigoAtendente: 20 }),
  ];

  assert.equal(usuarioComCodigoAtendente(usuarios, 10, "b")?.id, "a");
  assert.equal(usuarioComCodigoAtendente(usuarios, 10, "a"), undefined);
});
