import { config } from "./config";

export interface NotificacaoEncaminhamento {
  chamado: number;
  titulo: string;
  cliente: string;
  atendente: string;
  /** E-mail/UPN do atendente no Teams. Quando presente, o nome vira @mention. */
  emailAtendente?: string | null;
  minutosEncaminhamento: number;
  /** Dados do solicitante do chamado. Cada um e opcional: se faltar, some do card. */
  solicitante?: string | null;
  emailSolicitante?: string | null;
  telefoneSolicitante?: string | null;
}

/** Pagina real do chamado no SoftDesk (mesma rota usada como referer em assign.ts). */
function urlChamado(numero: number): string {
  return `${config.softdeskUrl}/encaminhar/${numero}`;
}

// FactSet nao suporta link em markdown no valor, entao as linhas "rotulo: valor"
// sao montadas manualmente com ColumnSet - a largura fixa do rotulo garante que
// todas as linhas (incluindo a do link) fiquem alinhadas na mesma coluna.
const LARGURA_ROTULO = "100px";

function linhaFato(rotulo: string, valor: string) {
  return {
    type: "ColumnSet",
    spacing: "Small",
    columns: [
      {
        type: "Column",
        width: LARGURA_ROTULO,
        items: [{ type: "TextBlock", text: rotulo, weight: "Bolder", isSubtle: true, wrap: true }],
      },
      {
        type: "Column",
        width: "stretch",
        items: [{ type: "TextBlock", text: valor, wrap: true }],
      },
    ],
  };
}

/** Valor da linha "Contato": e-mail (mailto) e/ou telefone (tel) clicaveis. Null se nao houver nenhum. */
function linhaContato(email: string | null, telefone: string | null): string | null {
  const partes: string[] = [];
  if (email) partes.push(`[${email}](mailto:${email})`);
  if (telefone) partes.push(`[${telefone}](tel:${telefone.replace(/\D/g, "")})`);
  return partes.length > 0 ? partes.join(" · ") : null;
}

/** Monta os elementos de um chamado no card. `separador` marca o inicio de cada bloco quando ha varios. */
function secaoChamado(info: NotificacaoEncaminhamento, separador: boolean): Record<string, unknown>[] {
  const email = info.emailAtendente ?? null;
  // Com e-mail cadastrado, o nome vira @mention de verdade: o Teams exige o par
  // <at>Nome</at> no texto + a entidade correspondente em msteams.entities. Sem
  // e-mail, cai pro nome como texto simples (comportamento antigo, nao quebra).
  const textoAtendente = email ? `<at>${info.atendente}</at>` : info.atendente;

  // Painel de dados do solicitante. Cada linha so entra se tiver conteudo -
  // nunca mostra rotulo com valor vazio. O cliente sempre existe.
  const detalhes: Record<string, unknown>[] = [];
  if (info.solicitante) detalhes.push(linhaFato("Solicitante", info.solicitante));
  detalhes.push(linhaFato("Cliente", info.cliente));
  const contato = linhaContato(info.emailSolicitante ?? null, info.telefoneSolicitante ?? null);
  if (contato) detalhes.push(linhaFato("Contato", contato));

  return [
    {
      // Cabecalho: "avatar" + rotulo + nome do atendente (menção). O nome
      // tambem vira o texto de preview da notificacao. Em passadas com varios
      // chamados, o separador marca visualmente o inicio de cada bloco.
      type: "ColumnSet",
      separator: separador,
      spacing: separador ? "Medium" : "Default",
      columns: [
        {
          type: "Column",
          width: "auto",
          verticalContentAlignment: "Center",
          items: [{ type: "TextBlock", text: "🎧", size: "ExtraLarge" }],
        },
        {
          type: "Column",
          width: "stretch",
          verticalContentAlignment: "Center",
          items: [
            { type: "TextBlock", text: "CHAMADO ENCAMINHADO", size: "Small", weight: "Bolder", color: "Accent", spacing: "None" },
            { type: "TextBlock", text: textoAtendente, size: "Large", weight: "Bolder", spacing: "None", wrap: true },
          ],
        },
      ],
    },
    {
      type: "TextBlock",
      text: `[${info.chamado}](${urlChamado(info.chamado)}) · ${info.titulo}`,
      size: "Medium",
      weight: "Bolder",
      wrap: true,
      spacing: "Medium",
    },
    {
      type: "Container",
      style: "emphasis",
      bleed: true,
      spacing: "Medium",
      items: detalhes,
    },
    {
      type: "TextBlock",
      text: `⏰ Ficou ${info.minutosEncaminhamento} min sem atendente`,
      color: "Warning",
      weight: "Bolder",
      wrap: true,
      spacing: "Medium",
    },
    {
      // Botao dentro da propria secao (ActionSet no corpo), pra ficar colado no
      // chamado. O actions no nivel do card empilharia todos os botoes no rodape.
      type: "ActionSet",
      spacing: "Small",
      actions: [{ type: "Action.OpenUrl", title: `Abrir #${info.chamado}`, url: urlChamado(info.chamado) }],
    },
  ];
}

/**
 * Uma entidade de mencao por atendente com e-mail cadastrado, sem repetir. Se o
 * mesmo atendente aparecer em mais de um chamado da passada, o par <at>Nome</at>
 * resolve pras duas ocorrencias com uma unica entidade.
 */
function entidadesMencao(lista: NotificacaoEncaminhamento[]): Record<string, unknown>[] {
  const vistos = new Set<string>();
  const entidades: Record<string, unknown>[] = [];

  for (const info of lista) {
    const email = info.emailAtendente ?? null;
    if (!email || vistos.has(info.atendente)) continue;
    vistos.add(info.atendente);
    entidades.push({
      type: "mention",
      text: `<at>${info.atendente}</at>`,
      mentioned: { id: email, name: info.atendente },
    });
  }

  return entidades;
}

function montarAdaptiveCard(lista: NotificacaoEncaminhamento[]) {
  const content: Record<string, unknown> = {
    $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
    type: "AdaptiveCard",
    version: "1.4",
    body: lista.flatMap((info, i) => secaoChamado(info, i > 0)),
  };

  const entidades = entidadesMencao(lista);
  if (entidades.length > 0) {
    content.msteams = { entities: entidades };
  }

  return {
    type: "message",
    attachments: [
      {
        contentType: "application/vnd.microsoft.card.adaptive",
        contentUrl: null,
        content,
      },
    ],
  };
}

/**
 * Posta UMA mensagem no canal "Revezamento de chamados" do Teams (via o
 * workflow "Enviar alertas de webhook para um chat" no Power Automate) com
 * todos os encaminhamentos da passada, uma secao por chamado, na ordem em que
 * ocorreram. O payload precisa ser um Adaptive Card dentro de "attachments" -
 * um JSON solto e rejeitado pelo gatilho.
 *
 * Enviar tudo num disparo so (em vez de um POST por chamado) evita que o Power
 * Automate reordene as notificacoes: cada disparo separado vira uma execucao
 * assincrona sem garantia de ordem, entao 2+ chamados chegavam trocados.
 *
 * Nunca lanca excecao: uma falha aqui (Teams fora do ar, URL invalida etc.)
 * nao pode derrubar o rodizio, ja que os chamados ja foram realmente
 * encaminhados no SoftDesk antes desta funcao ser chamada. So loga o erro.
 */
export async function notificarTeams(lista: NotificacaoEncaminhamento[]): Promise<void> {
  if (!config.teamsWebhookUrl || lista.length === 0) return;

  const numeros = lista.map((i) => i.chamado).join(", ");
  try {
    const res = await fetch(config.teamsWebhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(montarAdaptiveCard(lista)),
    });

    if (!res.ok) {
      console.error(`Falha ao notificar o Teams (HTTP ${res.status}) para os chamados ${numeros}`);
    }
  } catch (err) {
    console.error(`Erro ao notificar o Teams para os chamados ${numeros}:`, err);
  }
}
