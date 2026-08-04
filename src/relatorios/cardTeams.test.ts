import { test } from "node:test";
import assert from "node:assert/strict";
import { montarCardRelatorios } from "./cardTeams";
import type { RelatorioDiario, RelatorioMensal, RelatorioSemanal, Relatorios } from "./gerar";

// 25/12/2026 cai numa sexta-feira: e o dia que junta bloqueio e semanal, ou
// seja, exatamente o caso em que o card poderia comer o relatorio da semana.
const SEXTA_DE_NATAL = { ano: 2026, mes: 12, dia: 25 };

const DIARIO: RelatorioDiario = {
  dia: SEXTA_DE_NATAL,
  ate: "17:45",
  total: 12,
  mediaAnterior: 10,
  variacao: 20,
  status: [{ rotulo: "Em atendimento", quantidade: 12 }],
  pico: { rotulo: "10h", quantidade: 4 },
};

const SEMANAL: RelatorioSemanal = {
  inicio: { ano: 2026, mes: 12, dia: 21 },
  fim: SEXTA_DE_NATAL,
  total: 48,
  totalAnterior: 50,
  variacao: -4,
  clientes: [{ rotulo: "JAGUAFRANGOS", quantidade: 10, percentual: 21 }],
  curvaAbc: [{ rotulo: "A", quantidade: 30 }],
  prioridades: [{ rotulo: "Alta", quantidade: 20 }],
};

const MENSAL: RelatorioMensal = {
  mes: { ano: 2026, mes: 11, dia: 1 },
  total: 200,
  totalAnterior: 180,
  variacao: 11,
  clientes: [{ rotulo: "JAGUAFRANGOS", quantidade: 40, percentual: 20 }],
  concentracao: 55,
  curvaAbc: [{ rotulo: "A", quantidade: 120 }],
};

function relatorios(parcial: Partial<Relatorios>): Relatorios {
  return { dia: SEXTA_DE_NATAL, diario: null, semanal: null, mensal: null, bloqueio: null, ...parcial };
}

/** Todos os `text` do card, em qualquer profundidade. */
function textos(card: unknown): string[] {
  const achados: string[] = [];

  const visitar = (no: unknown): void => {
    if (Array.isArray(no)) {
      no.forEach(visitar);
      return;
    }
    if (no && typeof no === "object") {
      const objeto = no as Record<string, unknown>;
      if (typeof objeto.text === "string") achados.push(objeto.text);
      Object.values(objeto).forEach(visitar);
    }
  };

  visitar(card);
  return achados;
}

/** O bloco de cabecalho que contem o rotulo, pra conferir o separador. */
function cabecalhoDe(card: unknown, rotulo: string): Record<string, unknown> | undefined {
  const corpo = (card as { attachments: { content: { body: Record<string, unknown>[] } }[] }).attachments[0].content.body;
  return corpo.find((bloco) => bloco.type === "ColumnSet" && textos(bloco).includes(rotulo));
}

test("dia normal monta o card de sempre", () => {
  const lista = textos(montarCardRelatorios(relatorios({ diario: DIARIO })));

  assert.ok(lista.includes("RELATÓRIO DIÁRIO"));
  assert.ok(!lista.includes("SEM EXPEDIENTE"));
});

test("dia bloqueado numa sexta NAO come o relatorio semanal", () => {
  // A regressao que este teste existe pra impedir: silenciar o card inteiro
  // num feriado que caia numa sexta nao adiaria o semanal, perderia - foi
  // assim que o mensal se perdia antes do ehPrimeiroDiaUtilDoMes.
  const lista = textos(
    montarCardRelatorios(relatorios({ bloqueio: "Natal", semanal: SEMANAL }))
  );

  assert.ok(lista.includes("RELATÓRIO SEMANAL"), "o semanal sumiu do card");
  assert.ok(!lista.includes("RELATÓRIO DIÁRIO"), "o diario nao devia sair em dia bloqueado");
  assert.ok(lista.includes("SEM EXPEDIENTE"), "sem o aviso, o card parece defeito");
  assert.ok(lista.some((t) => t.includes("Natal")), "o motivo do bloqueio precisa aparecer");
});

test("dia bloqueado no primeiro dia util NAO come o relatorio mensal", () => {
  const lista = textos(montarCardRelatorios(relatorios({ bloqueio: "Feriado municipal", mensal: MENSAL })));

  assert.ok(lista.includes("RELATÓRIO MENSAL"));
  assert.ok(!lista.includes("RELATÓRIO DIÁRIO"));
});

test("as tres secoes convivem quando a data pede as tres", () => {
  const lista = textos(montarCardRelatorios(relatorios({ diario: DIARIO, semanal: SEMANAL, mensal: MENSAL })));

  assert.ok(lista.includes("RELATÓRIO DIÁRIO"));
  assert.ok(lista.includes("RELATÓRIO SEMANAL"));
  assert.ok(lista.includes("RELATÓRIO MENSAL"));
});

test("o separador so aparece quando ha secao acima", () => {
  // Card comum: o diario abre sem separador e o semanal vem separado dele.
  const comum = montarCardRelatorios(relatorios({ diario: DIARIO, semanal: SEMANAL }));
  assert.equal(cabecalhoDe(comum, "RELATÓRIO DIÁRIO")?.separator, false);
  assert.equal(cabecalhoDe(comum, "RELATÓRIO SEMANAL")?.separator, true);

  // Dia bloqueado: o aviso e que abre, e o semanal continua separado.
  const bloqueado = montarCardRelatorios(relatorios({ bloqueio: "Natal", semanal: SEMANAL }));
  assert.equal(cabecalhoDe(bloqueado, "SEM EXPEDIENTE")?.separator, false);
  assert.equal(cabecalhoDe(bloqueado, "RELATÓRIO SEMANAL")?.separator, true);
});
