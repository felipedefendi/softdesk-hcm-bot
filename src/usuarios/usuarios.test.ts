import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { aplicarSucesso, aplicarTentativaFalha, contaBloqueada, emailValido, normalizarEmail, verificarSenha } from "./usuarios";
import type { Usuario } from "./tipos";

function usuarioBase(parcial: Partial<Usuario> = {}): Usuario {
  return {
    id: "u1",
    nome: "Teste",
    email: "teste@example.com",
    hashSenha: "",
    salt: "",
    papel: "comum",
    codigoAtendente: 10,
    ativo: true,
    tentativasFalhas: 0,
    bloqueadoAte: null,
    criadoEm: new Date().toISOString(),
    ...parcial,
  };
}

/** Mesmo algoritmo e tamanho de derivarHash() em usuarios.ts, pra montar um fixture sem tocar disco. */
function comSenha(senha: string): { salt: string; hashSenha: string } {
  const salt = crypto.randomBytes(16).toString("hex");
  const hashSenha = crypto.scryptSync(senha, Buffer.from(salt, "hex"), 64).toString("hex");
  return { salt, hashSenha };
}

test("normalizarEmail e emailValido", () => {
  assert.equal(normalizarEmail("  Felipe.Prado@Empresa.com.br  "), "felipe.prado@empresa.com.br");
  assert.equal(emailValido("felipe.prado@empresa.com.br"), true);
  assert.equal(emailValido("nao-e-email"), false);
  assert.equal(emailValido("falta-arroba.com"), false);
});

test("verificarSenha aceita a senha certa e recusa a errada", () => {
  const usuario = usuarioBase(comSenha("Senha123!"));
  assert.equal(verificarSenha(usuario, "Senha123!"), true);
  assert.equal(verificarSenha(usuario, "OutraSenha1!"), false);
});

test("verificarSenha recusa conta sem hash (convite ainda pendente), sem lancar", () => {
  const usuario = usuarioBase({ hashSenha: "", salt: "" });
  assert.equal(verificarSenha(usuario, "qualquer coisa"), false);
});

test("verificarSenha nao lanca com hash de tamanho corrompido", () => {
  const usuario = usuarioBase({ hashSenha: "ab", salt: crypto.randomBytes(16).toString("hex") });
  assert.doesNotThrow(() => verificarSenha(usuario, "Senha123!"));
  assert.equal(verificarSenha(usuario, "Senha123!"), false);
});

test("contaBloqueada compara contra o momento informado, nao o relogio real", () => {
  const agora = new Date("2026-08-04T12:00:00Z");
  const bloqueadaAteMaisTarde = usuarioBase({ bloqueadoAte: "2026-08-04T12:30:00Z" });
  const bloqueioJaExpirou = usuarioBase({ bloqueadoAte: "2026-08-04T11:59:00Z" });
  const semBloqueio = usuarioBase({ bloqueadoAte: null });

  assert.equal(contaBloqueada(bloqueadaAteMaisTarde, agora), true);
  assert.equal(contaBloqueada(bloqueioJaExpirou, agora), false);
  assert.equal(contaBloqueada(semBloqueio, agora), false);
});

test("aplicarTentativaFalha soma uma tentativa sem bloquear antes do limite", () => {
  const agora = new Date("2026-08-04T12:00:00Z");
  let usuario = usuarioBase({ tentativasFalhas: 0 });

  for (let i = 1; i < 5; i++) {
    usuario = aplicarTentativaFalha(usuario, agora);
    assert.equal(usuario.tentativasFalhas, i);
    assert.equal(usuario.bloqueadoAte, null, `nao devia bloquear na tentativa ${i}`);
  }
});

test("aplicarTentativaFalha bloqueia por 15 minutos exatos na quinta tentativa", () => {
  const agora = new Date("2026-08-04T12:00:00Z");
  let usuario = usuarioBase({ tentativasFalhas: 4 });

  usuario = aplicarTentativaFalha(usuario, agora);

  assert.equal(usuario.tentativasFalhas, 5);
  assert.equal(usuario.bloqueadoAte, new Date(agora.getTime() + 15 * 60 * 1000).toISOString());
});

test("aplicarSucesso zera tentativas e bloqueio", () => {
  const usuario = usuarioBase({ tentativasFalhas: 5, bloqueadoAte: "2026-08-04T12:30:00Z" });
  const depois = aplicarSucesso(usuario);

  assert.equal(depois.tentativasFalhas, 0);
  assert.equal(depois.bloqueadoAte, null);
});
