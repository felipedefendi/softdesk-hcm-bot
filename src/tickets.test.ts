import { test } from "node:test";
import assert from "node:assert/strict";
import { deveEncaminhar, minutosResolucaoDoDetalhe } from "./tickets";

function detalheComSlas(slas: Array<{ nome: string; decorrido: string }>): Record<string, unknown> {
  return { sla: { sla: slas } };
}

test("deveEncaminhar: encaminhamento no limite encaminha (fluxo normal)", () => {
  assert.equal(deveEncaminhar(15, 0, 15), true);
  assert.equal(deveEncaminhar(20, 0, 15), true);
});

test("deveEncaminhar: abaixo do limite e sem resolucao maior espera", () => {
  assert.equal(deveEncaminhar(5, 0, 15), false);
});

test("deveEncaminhar: encaminhamento travado e resolucao maior encaminha", () => {
  // O caso dos transferidos de volta: encaminhamento parado em 3 min, resolucao
  // ja em 50 -> entra no rodizio assim mesmo.
  assert.equal(deveEncaminhar(3, 50, 15), true);
});

test("deveEncaminhar: resolucao igual ou menor que encaminhamento nao dispara a regra", () => {
  assert.equal(deveEncaminhar(3, 3, 15), false);
  assert.equal(deveEncaminhar(8, 2, 15), false);
});

test("minutosResolucaoDoDetalhe: le o SLA de Resolucao mesmo com acento", () => {
  const data = detalheComSlas([
    { nome: "Encaminhamento", decorrido: "00:03" },
    { nome: "Resolução", decorrido: "01:30" },
  ]);
  assert.equal(minutosResolucaoDoDetalhe(data), 90);
});

test("minutosResolucaoDoDetalhe: 0 quando o SLA nao existe (chamado novo)", () => {
  const data = detalheComSlas([{ nome: "Encaminhamento", decorrido: "00:05" }]);
  assert.equal(minutosResolucaoDoDetalhe(data), 0);
});

test("minutosResolucaoDoDetalhe: 0 quando o formato do decorrido e inesperado", () => {
  const data = detalheComSlas([{ nome: "Resolucao", decorrido: "--" }]);
  assert.equal(minutosResolucaoDoDetalhe(data), 0);
});
