import { test } from "node:test";
import assert from "node:assert/strict";
import type { ChamadoPesquisa } from "../pesquisa";
import {
  concentracaoTopClientes,
  faixaDePico,
  media,
  porCurvaAbc,
  porDia,
  porFaixaHoraria,
  porPrioridade,
  porStatus,
  topClientes,
  variacaoPercentual,
} from "./metricas";

let proximoNumero = 1;

function chamado(campos: Partial<ChamadoPesquisa> = {}): ChamadoPesquisa {
  return {
    numero: proximoNumero++,
    titulo: "titulo",
    cliente: "Cliente A",
    cdCliente: 1,
    curvaAbc: "A",
    status: "Em atendimento",
    prioridade: "Baixa",
    corPrioridade: "#a0f2f6",
    cdCategoria: 1,
    data: "2026-07-22",
    hora: "09:00:00",
    ...campos,
  };
}

test("porStatus agrupa e ordena do maior pro menor", () => {
  const chamados = [
    chamado({ status: "Fechado" }),
    chamado({ status: "Em atendimento" }),
    chamado({ status: "Fechado" }),
  ];

  assert.deepEqual(porStatus(chamados), [
    { rotulo: "Fechado", quantidade: 2 },
    { rotulo: "Em atendimento", quantidade: 1 },
  ]);
});

test("empate na contagem desempata pelo rotulo", () => {
  const chamados = [chamado({ status: "Zulu" }), chamado({ status: "Alfa" })];
  assert.deepEqual(porStatus(chamados).map((c) => c.rotulo), ["Alfa", "Zulu"]);
});

test("porPrioridade usa ordem de severidade, nao de volume", () => {
  const chamados = [
    chamado({ prioridade: "Baixa" }),
    chamado({ prioridade: "Baixa" }),
    chamado({ prioridade: "Crítica" }),
  ];

  assert.deepEqual(porPrioridade(chamados), [
    { rotulo: "Crítica", quantidade: 1 },
    { rotulo: "Baixa", quantidade: 2 },
  ]);
});

test("prioridade desconhecida vai pro fim da lista", () => {
  const chamados = [chamado({ prioridade: "Inventada" }), chamado({ prioridade: "Alta" })];
  assert.deepEqual(porPrioridade(chamados).map((c) => c.rotulo), ["Alta", "Inventada"]);
});

test("porCurvaAbc ordena A-B-C e joga o sem curva pro fim", () => {
  const chamados = [
    chamado({ curvaAbc: "C" }),
    chamado({ curvaAbc: "A" }),
    chamado({ curvaAbc: "A" }),
    chamado({ curvaAbc: null }),
  ];

  assert.deepEqual(porCurvaAbc(chamados).map((c) => c.rotulo), ["A", "C", "(nao informado)"]);
});

test("topClientes limita a quantidade e calcula o peso no total", () => {
  const chamados = [
    ...Array.from({ length: 3 }, () => chamado({ cliente: "Alfa" })),
    chamado({ cliente: "Beta" }),
  ];

  assert.deepEqual(topClientes(chamados, 1), [{ rotulo: "Alfa", quantidade: 3, percentual: 75 }]);
});

test("concentracaoTopClientes soma o peso dos maiores", () => {
  const chamados = [
    ...Array.from({ length: 3 }, () => chamado({ cliente: "Alfa" })),
    chamado({ cliente: "Beta" }),
  ];

  assert.equal(concentracaoTopClientes(chamados, 2), 100);
  assert.equal(concentracaoTopClientes(chamados, 1), 75);
});

test("porFaixaHoraria agrupa por hora em ordem cronologica", () => {
  const chamados = [
    chamado({ hora: "14:30:00" }),
    chamado({ hora: "09:05:00" }),
    chamado({ hora: "09:59:00" }),
  ];

  assert.deepEqual(porFaixaHoraria(chamados), [
    { rotulo: "09h", quantidade: 2 },
    { rotulo: "14h", quantidade: 1 },
  ]);
});

test("faixaDePico devolve a faixa mais cheia", () => {
  const chamados = [
    chamado({ hora: "08:00:00" }),
    chamado({ hora: "10:00:00" }),
    chamado({ hora: "10:30:00" }),
  ];

  assert.deepEqual(faixaDePico(chamados), { rotulo: "10h", quantidade: 2 });
});

test("porDia ordena cronologicamente", () => {
  const chamados = [chamado({ data: "2026-07-22" }), chamado({ data: "2026-07-20" })];
  assert.deepEqual(porDia(chamados).map((c) => c.rotulo), ["2026-07-20", "2026-07-22"]);
});

test("variacaoPercentual sobe, desce e protege divisao por zero", () => {
  assert.equal(variacaoPercentual(22, 20), 10);
  assert.equal(variacaoPercentual(15, 20), -25);
  assert.equal(variacaoPercentual(5, 0), null);
});

test("media arredonda pra uma casa decimal", () => {
  assert.equal(media([29, 15, 22, 27, 18]), 22.2);
  assert.equal(media([]), 0);
});

test("listas vazias nao quebram nem inventam dado", () => {
  assert.deepEqual(porStatus([]), []);
  assert.deepEqual(topClientes([], 5), []);
  assert.equal(concentracaoTopClientes([], 5), 0);
  assert.equal(faixaDePico([]), null);
});
