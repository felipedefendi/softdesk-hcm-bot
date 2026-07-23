import { test } from "node:test";
import assert from "node:assert/strict";
import { detectarRodizioTravado, diaDaLinhaDeLog } from "./alertaRodizio";

// 20/07/2026 e segunda; 18 e 19 sao fim de semana.
const HOJE = { ano: 2026, mes: 7, dia: 22 }; // quarta

function entrada(horario: string, atendente: string) {
  return { horario, atendente };
}

test("diaDaLinhaDeLog le o formato gravado pelo log.ts", () => {
  assert.deepEqual(diaDaLinhaDeLog("15/07/2026, 11:42:11"), { ano: 2026, mes: 7, dia: 15 });
  assert.deepEqual(diaDaLinhaDeLog("15/07/2026 11:42:11"), { ano: 2026, mes: 7, dia: 15 });
  assert.equal(diaDaLinhaDeLog(null), null);
  assert.equal(diaDaLinhaDeLog("linha corrompida"), null);
});

test("quem recebeu recentemente nao entra no alerta", () => {
  const entradas = [entrada("21/07/2026, 09:00:00", "Ana"), entrada("22/07/2026, 09:00:00", "Bruno")];
  assert.deepEqual(detectarRodizioTravado(entradas, ["Ana", "Bruno"], HOJE, 5), []);
});

test("conta dias uteis, nao corridos", () => {
  // 16/07 e quinta. Ate quarta 22/07 sao 4 dias uteis (17, 20, 21, 22) -
  // fim de semana 18 e 19 nao contam. Com limite 5, ainda nao alerta.
  const entradas = [entrada("16/07/2026, 09:00:00", "Ana")];
  assert.deepEqual(detectarRodizioTravado(entradas, ["Ana"], HOJE, 5), []);

  // Com limite 4, alerta.
  assert.deepEqual(detectarRodizioTravado(entradas, ["Ana"], HOJE, 4), [
    { atendente: "Ana", diasUteis: 4 },
  ]);
});

test("quem nunca aparece no historico entra com diasUteis null", () => {
  const entradas = [entrada("22/07/2026, 09:00:00", "Ana")];
  assert.deepEqual(detectarRodizioTravado(entradas, ["Ana", "Novato"], HOJE, 5), [
    { atendente: "Novato", diasUteis: null },
  ]);
});

test("atendente inativo nao entra - nao receber e o comportamento correto", () => {
  const entradas = [entrada("01/06/2026, 09:00:00", "Ferias")];
  // "Ferias" nao esta na lista de ativos, entao nao aparece.
  assert.deepEqual(detectarRodizioTravado(entradas, [], HOJE, 5), []);
});

test("usa o encaminhamento mais recente de cada um, nao o primeiro", () => {
  const entradas = [
    entrada("01/06/2026, 09:00:00", "Ana"),
    entrada("22/07/2026, 09:00:00", "Ana"),
  ];
  assert.deepEqual(detectarRodizioTravado(entradas, ["Ana"], HOJE, 5), []);
});

test("ordena do mais grave pro menos, com o sem-registro no topo", () => {
  const entradas = [
    entrada("16/07/2026, 09:00:00", "QuatroDias"),
    entrada("15/07/2026, 09:00:00", "CincoDias"),
  ];

  const alerta = detectarRodizioTravado(entradas, ["QuatroDias", "CincoDias", "Novato"], HOJE, 1);
  assert.deepEqual(alerta.map((a) => a.atendente), ["Novato", "CincoDias", "QuatroDias"]);
});
