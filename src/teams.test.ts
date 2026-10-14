import { test } from "node:test";
import assert from "node:assert/strict";
import { montarAdaptiveCard, ordenarParaEnvio, type NotificacaoEncaminhamento } from "./teams";

const BASE = new Date("2026-10-14T11:00:10Z"); // 08:00:10 em Sao Paulo

function notif(ordem: number, atendente: string, segundos = ordem): NotificacaoEncaminhamento {
  return {
    ordem,
    atribuidoEm: new Date(BASE.getTime() + segundos * 1000),
    chamado: 98500 + ordem,
    titulo: `Chamado ${ordem}`,
    cliente: "Cliente",
    atendente,
    minutosEncaminhamento: 15,
  };
}

/** Os rotulos "CHAMADO ENCAMINHADO · ..." do card, na ordem em que aparecem. */
function rotulos(lista: NotificacaoEncaminhamento[]): string[] {
  const texto = JSON.stringify(montarAdaptiveCard(lista));
  return [...texto.matchAll(/CHAMADO ENCAMINHADO[^"]*/g)].map((m) => m[0]);
}

test("lista embaralhada sai na ordem da atribuicao", () => {
  const ordenada = ordenarParaEnvio([notif(3, "Dioni"), notif(1, "Gabriel"), notif(2, "Felipe")]);
  assert.deepEqual(ordenada.map((n) => n.atendente), ["Gabriel", "Felipe", "Dioni"]);
});

test("ordem que discorda do horario real usa o horario", () => {
  // "ordem" diz Felipe primeiro, mas o SoftDesk atribuiu o Gabriel antes.
  const ordenada = ordenarParaEnvio([notif(1, "Felipe", 5), notif(2, "Gabriel", 1)]);
  assert.deepEqual(ordenada.map((n) => [n.atendente, n.ordem]), [["Gabriel", 1], ["Felipe", 2]]);
});

test("card numera cada chamado com hora de Sao Paulo", () => {
  const ordenada = ordenarParaEnvio([notif(2, "Felipe"), notif(1, "Gabriel"), notif(3, "Dioni")]);
  assert.deepEqual(rotulos(ordenada), [
    "CHAMADO ENCAMINHADO · 08:00 · 1 de 3",
    "CHAMADO ENCAMINHADO · 08:00 · 2 de 3",
    "CHAMADO ENCAMINHADO · 08:00 · 3 de 3",
  ]);
});

test("chamado sozinho nao mostra posicao", () => {
  assert.deepEqual(rotulos(ordenarParaEnvio([notif(1, "Gabriel")])), ["CHAMADO ENCAMINHADO · 08:00"]);
});
