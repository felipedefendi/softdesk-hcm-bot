import { config } from "./config";

interface NotificacaoEncaminhamento {
  chamado: number;
  titulo: string;
  cliente: string;
  atendente: string;
  /** E-mail/UPN do atendente no Teams. Quando presente, o nome vira @mention. */
  emailAtendente?: string | null;
  minutosEncaminhamento: number;
}

/** Pagina real do chamado no SoftDesk (mesma rota usada como referer em assign.ts). */
function urlChamado(numero: number): string {
  return `${config.softdeskUrl}/encaminhar/${numero}`;
}

// FactSet nao suporta link em markdown no valor, entao as linhas "rotulo: valor"
// sao montadas manualmente com ColumnSet - a largura fixa do rotulo garante que
// todas as linhas (incluindo a do link) fiquem alinhadas na mesma coluna.
const LARGURA_ROTULO = "140px";

function linhaFato(rotulo: string, valor: string) {
  return {
    type: "ColumnSet",
    spacing: "Small",
    columns: [
      {
        type: "Column",
        width: LARGURA_ROTULO,
        items: [{ type: "TextBlock", text: rotulo, weight: "Bolder", wrap: true }],
      },
      {
        type: "Column",
        width: "stretch",
        items: [{ type: "TextBlock", text: valor, wrap: true }],
      },
    ],
  };
}

function montarAdaptiveCard(info: NotificacaoEncaminhamento) {
  const email = info.emailAtendente ?? null;
  // Com e-mail cadastrado, o nome vira @mention de verdade: o Teams exige o par
  // <at>Nome</at> no texto + a entidade correspondente em msteams.entities. Sem
  // e-mail, cai pro nome como texto simples (comportamento antigo, nao quebra).
  const textoAtendente = email ? `<at>${info.atendente}</at>` : info.atendente;

  const content: Record<string, unknown> = {
    $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
    type: "AdaptiveCard",
    version: "1.4",
    body: [
      {
        // Primeiro bloco de texto - a notificacao/preview do Teams costuma
        // mostrar justamente este primeiro texto, entao deixamos so o nome
        // do atendente aqui pra facilitar a vida de quem ve a notificacao.
        type: "TextBlock",
        text: textoAtendente,
        weight: "Bolder",
        size: "Large",
        wrap: true,
      },
      {
        type: "TextBlock",
        text: "🔔 Chamado encaminhado automaticamente",
        wrap: true,
        spacing: "Small",
        isSubtle: true,
      },
      {
        type: "TextBlock",
        text: info.titulo,
        wrap: true,
        spacing: "Small",
      },
      linhaFato("Chamado:", `[#${info.chamado}](${urlChamado(info.chamado)})`),
      linhaFato("Cliente:", info.cliente),
      linhaFato("Encaminhamento:", `${info.minutosEncaminhamento} min`),
    ],
  };

  if (email) {
    content.msteams = {
      entities: [
        {
          type: "mention",
          text: `<at>${info.atendente}</at>`,
          mentioned: { id: email, name: info.atendente },
        },
      ],
    };
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
 * Posta uma notificacao no canal "Revezamento de chamados" do Teams via o
 * workflow "Enviar alertas de webhook para um chat" (Power Automate). O
 * payload precisa ser um Adaptive Card dentro de "attachments" - um JSON
 * solto e rejeitado pelo gatilho.
 *
 * Nunca lanca excecao: uma falha aqui (Teams fora do ar, URL invalida etc.)
 * nao pode derrubar o rodizio, ja que o chamado ja foi realmente encaminhado
 * no SoftDesk antes desta funcao ser chamada. So loga o erro.
 */
export async function notificarTeams(info: NotificacaoEncaminhamento): Promise<void> {
  if (!config.teamsWebhookUrl) return;

  try {
    const res = await fetch(config.teamsWebhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(montarAdaptiveCard(info)),
    });

    if (!res.ok) {
      console.error(`Falha ao notificar o Teams (HTTP ${res.status}) para o chamado ${info.chamado}`);
    }
  } catch (err) {
    console.error(`Erro ao notificar o Teams para o chamado ${info.chamado}:`, err);
  }
}
