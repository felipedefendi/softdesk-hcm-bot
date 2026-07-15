import { config } from "./config";

interface NotificacaoEncaminhamento {
  chamado: number;
  titulo: string;
  cliente: string;
  atendente: string;
  minutosEncaminhamento: number;
}

function montarAdaptiveCard(info: NotificacaoEncaminhamento) {
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
          body: [
            {
              // Primeiro bloco de texto - a notificacao/preview do Teams costuma
              // mostrar justamente este primeiro texto, entao deixamos so o nome
              // do atendente aqui pra facilitar a vida de quem ve a notificacao.
              type: "TextBlock",
              text: info.atendente,
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
            {
              type: "FactSet",
              facts: [
                { title: "Chamado:", value: `#${info.chamado}` },
                { title: "Cliente:", value: info.cliente },
                { title: "Encaminhamento:", value: `${info.minutosEncaminhamento} min` },
                { title: "Horário:", value: new Date().toLocaleString("pt-BR") },
              ],
            },
          ],
        },
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
