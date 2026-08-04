import { test } from "node:test";
import assert from "node:assert/strict";
import { podeFazer } from "./permissoes";
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

test("conta inativa nunca pode nada, nem sendo admin", () => {
  const admin = usuario({ papel: "admin", ativo: false });
  assert.equal(podeFazer(admin, "usuarios:gerenciar"), false);
  assert.equal(podeFazer(admin, "ver-paineis"), false);
});

test("admin pode tudo que esta mapeado", () => {
  const admin = usuario({ papel: "admin" });
  const acoes = [
    "ver-paineis",
    "rodizio:definir-proximo",
    "rodizio:forcar-verificacao",
    "rodizio:reordenar",
    "atendente:desativar-proprio",
    "atendente:desativar-outros",
    "agenda:ferias-propria",
    "agenda:ferias-outros",
    "agenda:dia-especial",
    "cofre:usar",
    "senha:trocar-propria",
    "automacao:pausar-retomar",
    "configuracoes:alterar",
    "usuarios:gerenciar",
    "auditoria:ver",
  ] as const;

  for (const acao of acoes) assert.equal(podeFazer(admin, acao), true, acao);
});

test("comum tem as acoes liberadas a todos", () => {
  const comum = usuario({ papel: "comum" });
  for (const acao of ["ver-paineis", "rodizio:definir-proximo", "rodizio:forcar-verificacao", "cofre:usar", "senha:trocar-propria"] as const) {
    assert.equal(podeFazer(comum, acao), true, acao);
  }
});

test("comum nao tem as acoes exclusivas de admin", () => {
  const comum = usuario({ papel: "comum" });
  for (const acao of [
    "atendente:desativar-outros",
    "agenda:ferias-outros",
    "agenda:dia-especial",
    "rodizio:reordenar",
    "automacao:pausar-retomar",
    "configuracoes:alterar",
    "usuarios:gerenciar",
    "auditoria:ver",
  ] as const) {
    assert.equal(podeFazer(comum, acao), false, acao);
  }
});

test("comum pode desativar o proprio atendente, nao o de outro", () => {
  const comum = usuario({ papel: "comum", codigoAtendente: 10 });

  assert.equal(podeFazer(comum, "atendente:desativar-proprio", { codigoAtendente: 10 }), true);
  assert.equal(podeFazer(comum, "atendente:desativar-proprio", { codigoAtendente: 99 }), false);
});

test("comum pode agendar a propria ferias, nao a de outro", () => {
  const comum = usuario({ papel: "comum", codigoAtendente: 10 });

  assert.equal(podeFazer(comum, "agenda:ferias-propria", { codigoAtendente: 10 }), true);
  assert.equal(podeFazer(comum, "agenda:ferias-propria", { codigoAtendente: 99 }), false);
});

test("acao 'propria' sem vinculo de atendente nunca libera, mesmo o proprio id batendo por acaso", () => {
  // Gestor/admin sem atendente vinculado: nao ha "proprio" pra fazer.
  const semVinculo = usuario({ papel: "comum", codigoAtendente: null });
  assert.equal(podeFazer(semVinculo, "agenda:ferias-propria", { codigoAtendente: null as unknown as number }), false);
});

test("acao 'propria' sem alvo informado nao libera", () => {
  const comum = usuario({ papel: "comum", codigoAtendente: 10 });
  assert.equal(podeFazer(comum, "atendente:desativar-proprio"), false);
});
