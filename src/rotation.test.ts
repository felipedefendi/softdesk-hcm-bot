import { test } from "node:test";
import assert from "node:assert/strict";
import { ponteiroAposRemover } from "./rotation";

const ORDEM = ["Ana", "Bruno", "Rodrigo", "Carla", "Diego"];

test("ponteiro que nao aponta pro removido nao muda", () => {
  assert.equal(ponteiroAposRemover("Ana", ORDEM, "Rodrigo"), "Ana");
});

test("removendo quem o ponteiro aponta, reaponta pro predecessor", () => {
  // ultimo = Rodrigo. Proximo natural seria Carla. Reaponta pra Bruno
  // (predecessor), pra que apos remover, o proximo continue sendo Carla.
  assert.equal(ponteiroAposRemover("Rodrigo", ORDEM, "Rodrigo"), "Bruno");
});

test("removido no topo da ordem: predecessor e o ultimo (wrap)", () => {
  assert.equal(ponteiroAposRemover("Ana", ORDEM, "Ana"), "Diego");
});

test("sobrando so o removido, ponteiro volta pra null", () => {
  assert.equal(ponteiroAposRemover("Ana", ["Ana"], "Ana"), null);
});

test("ponteiro nulo continua nulo", () => {
  assert.equal(ponteiroAposRemover(null, ORDEM, "Rodrigo"), null);
});
