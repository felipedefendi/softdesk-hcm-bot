import { test } from "node:test";
import assert from "node:assert/strict";
import { podeFazer, type Principal } from "./permissoes";
import type { Usuario } from "./tipos";

function usuario(parcial: Partial<Usuario>): Usuario {
  return {
    id: "u1",
    nome: "Teste",
    email: "teste@example.com",
    hashSenha: "x",
    salt: "y",
    papel: "comum",
    codigoAtendente: 10,
    ativo: true,
    tentativasFalhas: 0,
    bloqueadoAte: null,
    criadoEm: new Date().toISOString(),
    ...parcial,
  };
}

function pessoa(parcial: Partial<Usuario>): Principal {
  return { tipo: "pessoa", usuario: usuario(parcial) };
}

test("conta inativa nunca pode nada, nem sendo admin", () => {
  const admin = pessoa({ papel: "admin", ativo: false });
  assert.equal(podeFazer(admin, "usuarios:gerenciar"), false);
  assert.equal(podeFazer(admin, "ver-paineis"), false);
});

test("admin pode tudo que esta mapeado, sem depender de alvo", () => {
  const admin = pessoa({ papel: "admin", codigoAtendente: null });
  const acoes = [
    "ver-paineis",
    "rodizio:definir-proximo",
    "rodizio:forcar-verificacao",
    "rodizio:reordenar",
    "atendente:desativar",
    "agenda:ferias",
    "agenda:dia-especial",
    "cofre:usar",
    "senha:trocar-propria",
    "automacao:pausar-retomar",
    "configuracoes:alterar",
    "usuarios:gerenciar",
    "auditoria:ver",
  ] as const;

  for (const acao of acoes) assert.equal(podeFazer(admin, acao), true, acao);
  // Admin sem atendente vinculado ainda pode mexer no atendente de qualquer um.
  assert.equal(podeFazer(admin, "atendente:desativar", { codigoAtendente: 42 }), true);
});

test("comum tem as acoes liberadas a todos", () => {
  const comum = pessoa({ papel: "comum" });
  for (const acao of ["ver-paineis", "rodizio:definir-proximo", "rodizio:forcar-verificacao", "cofre:usar", "senha:trocar-propria"] as const) {
    assert.equal(podeFazer(comum, acao), true, acao);
  }
});

test("comum nao tem as acoes exclusivas de admin", () => {
  const comum = pessoa({ papel: "comum" });
  for (const acao of [
    "rodizio:reordenar",
    "agenda:dia-especial",
    "automacao:pausar-retomar",
    "configuracoes:alterar",
    "usuarios:gerenciar",
    "auditoria:ver",
  ] as const) {
    assert.equal(podeFazer(comum, acao), false, acao);
  }
});

test("comum pode desativar o proprio atendente, nao o de outro", () => {
  const comum = pessoa({ papel: "comum", codigoAtendente: 10 });

  assert.equal(podeFazer(comum, "atendente:desativar", { codigoAtendente: 10 }), true);
  assert.equal(podeFazer(comum, "atendente:desativar", { codigoAtendente: 99 }), false);
});

test("comum pode agendar a propria ferias, nao a de outro", () => {
  const comum = pessoa({ papel: "comum", codigoAtendente: 10 });

  assert.equal(podeFazer(comum, "agenda:ferias", { codigoAtendente: 10 }), true);
  assert.equal(podeFazer(comum, "agenda:ferias", { codigoAtendente: 99 }), false);
});

test("acao que depende do alvo sem vinculo de atendente nunca libera", () => {
  // Gestor/admin comum (raro, mas o campo e nulavel) sem atendente vinculado:
  // nao ha "proprio" pra fazer.
  const semVinculo = pessoa({ papel: "comum", codigoAtendente: null });
  assert.equal(podeFazer(semVinculo, "agenda:ferias", { codigoAtendente: null as unknown as number }), false);
});

test("acao que depende do alvo sem alvo informado nao libera", () => {
  const comum = pessoa({ papel: "comum", codigoAtendente: 10 });
  assert.equal(podeFazer(comum, "atendente:desativar"), false);
});
