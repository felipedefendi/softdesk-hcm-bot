# Plano: notificacao no Teams ao encaminhar um chamado

Canal alvo: "Revezamento de chamados"

## 1. Configuracao no Teams (feita manualmente, uma vez)

No canal "Revezamento de chamados" -> `...` -> **Workflows** -> template
**"Publicar no canal quando um webhook for recebido"** (Power Automate).

Isso gera uma URL HTTPS secreta e unica para aquele canal. E o metodo
recomendado hoje - os antigos "Incoming Webhooks/Conectores O365" estao sendo
descontinuados pela Microsoft. Nao exige admin do Azure AD, so precisa ser
dono/membro do canal.

Alternativa descartada: Microsoft Graph API (exige registrar app no Azure AD,
permissoes admin-consent `ChannelMessage.Send`, gerenciar tokens OAuth - muito
mais complexo so para notificar).

## 2. Payload que o bot envia

Corrigido apos ver a documentacao (https://learn.microsoft.com/pt-br/connectors/teams/):
o gatilho de webhook do Teams SO aceita um Adaptive Card dentro de
`attachments`, nao um JSON solto com campos customizados. Formato real usado:

```json
{
  "type": "message",
  "attachments": [
    {
      "contentType": "application/vnd.microsoft.card.adaptive",
      "contentUrl": null,
      "content": {
        "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
        "type": "AdaptiveCard",
        "version": "1.4",
        "body": [
          { "type": "TextBlock", "text": "🔔 Chamado encaminhado automaticamente", "weight": "Bolder", "size": "Medium" },
          { "type": "TextBlock", "text": "<titulo do chamado>", "wrap": true },
          {
            "type": "FactSet",
            "facts": [
              { "title": "Chamado:", "value": "#95336" },
              { "title": "Cliente:", "value": "PONTO RURAL" },
              { "title": "Atendente:", "value": "Dioni Magalhaes" },
              { "title": "Encaminhamento:", "value": "36 min" },
              { "title": "Horário:", "value": "14/07/2026, 11:00:25" }
            ]
          }
        ]
      }
    }
  ]
}
```

## 3. Codigo novo

- `src/teams.ts` - funcao `notificarTeams(...)` que faz um POST HTTPS para a
  URL do webhook.
- Nova variavel `TEAMS_WEBHOOK_URL` no `.env` (nunca commitada, mesmo
  tratamento das credenciais do SoftDesk).
- A chamada so acontece **depois** que `avancarRodizio()` +
  `registrarEncaminhamento()` ja confirmaram que a atribuicao realmente
  funcionou no SoftDesk - mesma licao do "falso positivo" que ocorreu na
  primeira execucao real: nunca notificar algo que nao aconteceu de fato.

## 4. Tratamento de falha

Se o POST pro Teams falhar (canal indisponivel, URL errada etc.), so loga o
erro e segue o processamento dos proximos chamados - a notificacao nunca trava
o rodizio, ja que o chamado ja foi realmente encaminhado no SoftDesk nesse
ponto.

## 5. Pendencias (aguardando o usuario)

- [x] Criar o Workflow no canal e passar a URL gerada (salva em `.env`,
      `TEAMS_WEBHOOK_URL`)
- [x] Codigo implementado: `src/teams.ts` + chamada em `index.ts`/`run-once.ts`
      logo apos `avancarRodizio()`/`registrarEncaminhamento()`
- [ ] Testar o envio de verdade (precisa de aprovacao explicita - vai postar
      no canal real)
- [ ] Segunda feature mencionada pelo usuario (ainda nao descrita)
