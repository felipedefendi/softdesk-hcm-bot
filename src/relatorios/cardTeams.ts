/**
 * Adaptive Cards dos relatorios. Mesmo vocabulario visual do card de
 * encaminhamento (cabecalho com icone, Container "emphasis" com bleed), mas com
 * icone e titulo proprios pra ninguem confundir relatorio com chamado novo.
 */
import { diaDaSemana, type DiaCivil } from "./periodos";
import type { RelatorioDiario } from "./gerar";
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

function rotuloDoDia(dia: DiaCivil): string {
  const dd = String(dia.dia).padStart(2, "0");
  const mm = String(dia.mes).padStart(2, "0");
  return `${DIAS_DA_SEMANA[diaDaSemana(dia)]}, ${dd}/${mm}`;
}

function plural(quantidade: number, singular: string, plural: string): string {
  return `${quantidade} ${quantidade === 1 ? singular : plural}`;
}

/**
 * Linha de contagem: rotulo ocupa o espaco disponivel e o numero fica encostado
 * na direita. Diferente do linhaFato do teams.ts (rotulo de largura fixa), que
 * quebraria em rotulos longos como "Aguardando solicitante".
 */
function linhaContagem(item: Contagem) {
  return {
    type: "ColumnSet",
    spacing: "Small",
    columns: [
      {
        type: "Column",
        width: "stretch",
        items: [{ type: "TextBlock", text: item.rotulo, wrap: true }],
      },
      {
        type: "Column",
        width: "auto",
        items: [{ type: "TextBlock", text: String(item.quantidade), weight: "Bolder" }],
      },
    ],
  };
}

function cabecalho(icone: string, rotulo: string, titulo: string) {
  return {
    type: "ColumnSet",
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

/**
 * Frase de comparacao com a media recente. Deliberadamente neutra (sem cor de
 * alerta e sem "bom/ruim"): volume alto nao e culpa de ninguem, e o relatorio
 * nao existe pra pressionar o time.
 */
export function textoComparacao(relatorio: RelatorioDiario): string | null {
  if (relatorio.variacao === null) return null;

  const base = `média dos últimos dias úteis (${relatorio.mediaAnterior.toString().replace(".", ",")})`;
  if (relatorio.variacao === 0) return `Em linha com a ${base}`;

  const seta = relatorio.variacao > 0 ? "↑" : "↓";
  const direcao = relatorio.variacao > 0 ? "acima" : "abaixo";
  return `${seta} ${Math.abs(relatorio.variacao)}% ${direcao} da ${base}`;
}

export function montarCardDiario(relatorio: RelatorioDiario) {
  const body: Record<string, unknown>[] = [
    cabecalho("📊", "RELATÓRIO DIÁRIO", rotuloDoDia(relatorio.dia)),
    {
      type: "TextBlock",
      text: `${plural(relatorio.total, "chamado aberto", "chamados abertos")} até ${relatorio.ate}`,
      size: "Medium",
      weight: "Bolder",
      wrap: true,
      spacing: "Medium",
    },
  ];

  const comparacao = textoComparacao(relatorio);
  if (comparacao) {
    body.push({ type: "TextBlock", text: comparacao, isSubtle: true, wrap: true, spacing: "None" });
  }

  if (relatorio.status.length > 0) {
    // Sem este rotulo, "Aguardando solicitante: 8" e lido como se fossem 8 na
    // fila inteira, e nao 8 dos abertos hoje.
    body.push({
      type: "TextBlock",
      text: "Situação atual dos chamados de hoje",
      size: "Small",
      isSubtle: true,
      wrap: true,
      spacing: "Medium",
    });
    body.push({
      // Sem `bleed`: no tema escuro do Teams o container "emphasis" fica mais
      // escuro que o fundo, e sangrando ate a borda ele virava uma faixa que
      // empurrava o que vinha depois pra aparencia de rodape.
      type: "Container",
      style: "emphasis",
      spacing: "Small",
      items: relatorio.status.map(linhaContagem),
    });
  }

  if (relatorio.pico) {
    body.push({
      type: "TextBlock",
      text: `⏰ Pico às ${relatorio.pico.rotulo} — ${plural(relatorio.pico.quantidade, "chamado", "chamados")}`,
      wrap: true,
      spacing: "Medium",
      // Separa do bloco acima pra nao se confundir com o rodape do conector.
      separator: true,
    });
  }

  return envelope(body);
}

/**
 * Card de falha. Sem ele, um relatorio que nao saiu seria lido como "dia sem
 * chamado" - silencio e o pior desfecho possivel aqui.
 */
export function montarCardFalha(dia: DiaCivil, motivo: string) {
  return envelope([
    cabecalho("⚠️", "RELATÓRIO NÃO GERADO", rotuloDoDia(dia)),
    {
      type: "TextBlock",
      text: "Não foi possível consultar o SoftDesk depois de várias tentativas. Os números de hoje não estão neste card.",
      wrap: true,
      spacing: "Medium",
    },
    {
      type: "Container",
      style: "emphasis",
      bleed: true,
      spacing: "Medium",
      items: [{ type: "TextBlock", text: motivo, wrap: true, isSubtle: true }],
    },
  ]);
}
