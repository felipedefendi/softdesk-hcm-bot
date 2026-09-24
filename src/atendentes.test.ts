import { test } from "node:test";
import assert from "node:assert/strict";
import { comAtendenteAdicionado, planoDeAtendenteNaNovaConta, type Atendente } from "./atendentes";

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

test("nova conta sem codigo fica fora do rodizio", () => {
  assert.equal(planoDeAtendenteNaNovaConta([ANA], null, false), "nenhum");
});

test("nova conta com codigo ja cadastrado so vincula, marcada ou nao", () => {
  assert.equal(planoDeAtendenteNaNovaConta([ANA], 10, false), "vincular");
  assert.equal(planoDeAtendenteNaNovaConta([ANA], 10, true), "vincular");
});

test("usuario atendente com codigo novo cria o atendente", () => {
  assert.equal(planoDeAtendenteNaNovaConta([ANA], 99, true), "criar");
});

test("codigo desconhecido sem marcar usuario atendente e recusado", () => {
  assert.throws(() => planoDeAtendenteNaNovaConta([ANA], 99, false), /não encontrado/);
});

test("usuario atendente exige codigo inteiro positivo", () => {
  assert.throws(() => planoDeAtendenteNaNovaConta([ANA], null, true), /Informe o código/);
  assert.throws(() => planoDeAtendenteNaNovaConta([ANA], 0, true), /inválido/);
  assert.throws(() => planoDeAtendenteNaNovaConta([ANA], 1.5, true), /inválido/);
});
