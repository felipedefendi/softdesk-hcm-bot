/**
 * Adaptive Cards dos relatorios. Mesmo vocabulario visual do card de
 * encaminhamento (cabecalho com icone, Container "emphasis"), com icone e
 * titulo proprios pra ninguem confundir relatorio com chamado novo.
 *
 * Na sexta os dois relatorios vao numa **unica mensagem**, uma secao cada. Dois
 * disparos separados chegariam fora de ordem: o Power Automate trata cada
 * webhook como execucao assincrona independente (mesmo problema ja resolvido
 * assim no teams.ts).
 */
import { diaDaSemana, type DiaCivil } from "./periodos";
import type { RelatorioDiario, RelatorioSemanal, Relatorios } from "./gerar";
import type { Contagem } from "./metricas";

const DIAS_DA_SEMANA = [
  "domingo",
  "segunda-feira",
  "terça-feira",
  "quarta-feira",
  "quinta-feira",
  "sexta-feira",
  "sábado",
];

function diaEMes(dia: DiaCivil): string {
  return `${String(dia.dia).padStart(2, "0")}/${String(dia.mes).padStart(2, "0")}`;
}

function rotuloDoDia(dia: DiaCivil): string {
  return `${DIAS_DA_SEMANA[diaDaSemana(dia)]}, ${diaEMes(dia)}`;
}

function numeroBR(valor: number): string {
  return String(valor).replace(".", ",");
}

function plural(quantidade: number, singular: string, plural: string): string {
  return `${quantidade} ${quantidade === 1 ? singular : plural}`;
}

/** "Crítica 15 · Alta 30 · Baixa 49" - compacto, pra nao esticar o card. */
function listaInline(itens: Contagem[]): string {
  return itens.map((i) => `${i.rotulo} ${i.quantidade}`).join(" · ");
}

/**
 * Frase de comparacao. Deliberadamente neutra (sem cor de alerta e sem
 * "bom/ruim"): volume alto nao e culpa de ninguem, e o relatorio nao existe pra
 * pressionar o time.
 */
/** `base` deve comecar com "a " ("a semana anterior"), pra formar "da semana anterior". */
function textoVariacao(variacao: number | null, base: string): string | null {
  if (variacao === null) return null;
  if (variacao === 0) return `Em linha com ${base}`;

  const seta = variacao > 0 ? "↑" : "↓";
  const direcao = variacao > 0 ? "acima" : "abaixo";
  return `${seta} ${Math.abs(variacao)}% ${direcao} d${base}`;
}

/**
 * Linha de contagem: rotulo ocupa o espaco disponivel e o numero fica encostado
 * na direita. Diferente do linhaFato do teams.ts (rotulo de largura fixa), que
 * quebraria em rotulos longos como "Aguardando solicitante".
 */
function linhaContagem(rotulo: string, valor: string) {
  return {
    type: "ColumnSet",
    spacing: "Small",
    columns: [
      {
        type: "Column",
        width: "stretch",
        items: [{ type: "TextBlock", text: rotulo, wrap: true }],
      },
      {
        type: "Column",
        width: "auto",
        items: [{ type: "TextBlock", text: valor, weight: "Bolder" }],
      },
    ],
  };
}

function cabecalho(icone: string, rotulo: string, titulo: string, separador: boolean) {
  return {
    type: "ColumnSet",
    separator: separador,
    spacing: separador ? "Medium" : "Default",
    columns: [
      {
        type: "Column",
        width: "auto",
        verticalContentAlignment: "Center",
        items: [{ type: "TextBlock", text: icone, size: "ExtraLarge" }],
      },
      {
        type: "Column",
        width: "stretch",
        verticalContentAlignment: "Center",
        items: [
          { type: "TextBlock", text: rotulo, size: "Small", weight: "Bolder", color: "Accent", spacing: "None" },
          { type: "TextBlock", text: titulo, size: "Large", weight: "Bolder", spacing: "None", wrap: true },
        ],
      },
    ],
  };
}

function destaque(texto: string) {
  return { type: "TextBlock", text: texto, size: "Medium", weight: "Bolder", wrap: true, spacing: "Medium" };
}

/** Rotulo de secao: pequeno e apagado, existe pra nomear o bloco que vem abaixo. */
function legenda(texto: string) {
  return { type: "TextBlock", text: texto, size: "Small", isSubtle: true, wrap: true, spacing: "Medium" };
}

/**
 * Linha que carrega numero, nao rotulo. Tamanho normal de proposito: com o
 * estilo de `legenda` os dados do fim do card pareciam legenda de rodape.
 */
function dado(texto: string, spacing: string) {
  return { type: "TextBlock", text: texto, wrap: true, spacing };
}

function painel(itens: Record<string, unknown>[]) {
  // Sem `bleed`: no tema escuro do Teams o container "emphasis" fica mais escuro
  // que o fundo, e sangrando ate a borda virava uma faixa que empurrava o que
  // vinha depois pra aparencia de rodape.
  return { type: "Container", style: "emphasis", spacing: "Small", items: itens };
}

function envelope(body: Record<string, unknown>[]) {
  return {
    type: "message",
    attachments: [
      {
        contentType: "application/vnd.microsoft.card.adaptive",
        contentUrl: null,
        content: {
          $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
          type: "AdaptiveCard",
          version: "1.4",
          body,
        },
      },
    ],
  };
}

function secaoDiaria(r: RelatorioDiario, separador: boolean): Record<string, unknown>[] {
  const itens: Record<string, unknown>[] = [
    cabecalho("📊", "RELATÓRIO DIÁRIO", rotuloDoDia(r.dia), separador),
    destaque(`${plural(r.total, "chamado aberto", "chamados abertos")} até ${r.ate}`),
  ];

  const comparacao = textoVariacao(r.variacao, `a média dos últimos dias úteis (${numeroBR(r.mediaAnterior)})`);
  if (comparacao) {
    itens.push({ type: "TextBlock", text: comparacao, isSubtle: true, wrap: true, spacing: "None" });
  }

  if (r.status.length > 0) {
    // Sem este rotulo, "Aguardando solicitante: 8" e lido como se fossem 8 na
    // fila inteira, e nao 8 dos abertos hoje.
    itens.push(legenda("Situação atual dos chamados de hoje"));
    itens.push(painel(r.status.map((s) => linhaContagem(s.rotulo, String(s.quantidade)))));
  }

  if (r.pico) {
    itens.push({
      type: "TextBlock",
      text: `⏰ Pico às ${r.pico.rotulo} — ${plural(r.pico.quantidade, "chamado", "chamados")}`,
      wrap: true,
      spacing: "Medium",
      separator: true,
    });
  }

  return itens;
}

function secaoSemanal(r: RelatorioSemanal, separador: boolean): Record<string, unknown>[] {
  const itens: Record<string, unknown>[] = [
    cabecalho("📅", "RELATÓRIO SEMANAL", `${diaEMes(r.inicio)} a ${diaEMes(r.fim)}`, separador),
    destaque(`${plural(r.total, "chamado aberto", "chamados abertos")} na semana`),
  ];

  const comparacao = textoVariacao(r.variacao, `a semana anterior (${r.totalAnterior})`);
  if (comparacao) {
    itens.push({ type: "TextBlock", text: comparacao, isSubtle: true, wrap: true, spacing: "None" });
  }

  if (r.clientes.length > 0) {
    itens.push(legenda("Clientes com mais chamados"));
    itens.push(
      painel(r.clientes.map((c) => linhaContagem(c.rotulo, `${c.quantidade} (${c.percentual}%)`)))
    );
  }

  if (r.curvaAbc.length > 0) {
    itens.push(dado(`Curva ABC do cliente — ${listaInline(r.curvaAbc)}`, "Medium"));
  }

  if (r.prioridades.length > 0) {
    itens.push(dado(`Prioridade — ${listaInline(r.prioridades)}`, "Small"));
  }

  return itens;
}

export function montarCardRelatorios(relatorios: Relatorios) {
  const body = [...secaoDiaria(relatorios.diario, false)];
  if (relatorios.semanal) body.push(...secaoSemanal(relatorios.semanal, true));
  return envelope(body);
}

/**
 * Card de falha. Sem ele, um relatorio que nao saiu seria lido como "dia sem
 * chamado" - silencio e o pior desfecho possivel aqui.
 */
export function montarCardFalha(dia: DiaCivil, motivo: string) {
  return envelope([
    cabecalho("⚠️", "RELATÓRIO NÃO GERADO", rotuloDoDia(dia), false),
    {
      type: "TextBlock",
      text: "Não foi possível consultar o SoftDesk depois de várias tentativas. Os números de hoje não estão neste card.",
      wrap: true,
      spacing: "Medium",
    },
    painel([{ type: "TextBlock", text: motivo, wrap: true, isSubtle: true }]),
  ]);
}
