import { test } from "node:test";
import assert from "node:assert/strict";
import { comAtendenteAdicionado, type Atendente } from "./atendentes";

const ANA: Atendente = {
  nome: "Ana",
  codigoAtendente: 10,
  ativo: true,
  motivoInatividade: null,
  retornaEm: null,
  emailTeams: "ana",
};

const BRUNO: Atendente = {
  nome: "Bruno",
  codigoAtendente: 20,
  ativo: true,
  motivoInatividade: null,
  retornaEm: null,
  emailTeams: "bruno",
};

test("adiciona atendente no fim da ordem do rodizio", () => {
  const anteriores = [ANA];
  const resultado = comAtendenteAdicionado(anteriores, BRUNO);
  assert.deepEqual(resultado.map((a) => a.nome), ["Ana", "Bruno"]);
  assert.deepEqual(anteriores, [ANA]);
});

test("recusa nome de atendente repetido sem diferenciar maiusculas", () => {
  assert.throws(
    () => comAtendenteAdicionado([ANA], { ...BRUNO, nome: " ana " }),
    /Ja existe um atendente chamado/
  );
});

test("recusa codigo de atendente repetido", () => {
  assert.throws(
    () => comAtendenteAdicionado([ANA], { ...BRUNO, codigoAtendente: ANA.codigoAtendente }),
    /Ja existe um atendente com o codigo/
  );
});
