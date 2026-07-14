# Plano: Dashboard de administracao

## Objetivo

Painel web local para gerenciar a fila de rodizio (afastar/reativar atendentes
em casos de falta, ferias, etc.) e controles basicos da automacao, sem
precisar mexer em codigo ou em arquivos JSON na mao.

## Decisoes ja tomadas

- **Processo separado do bot.** Um servidor web (Express) que so le/edita os
  arquivos `state/*.json`. O bot (`npm run dev`) continua rodando
  independente e le o estado atualizado a cada ciclo (a cada 5 min por
  padrao). Um erro no dashboard nao derruba o monitoramento, e vice-versa.
- **Login com senha simples.** O dashboard fica protegido por uma senha
  basica (variavel de ambiente `DASHBOARD_PASSWORD` no `.env`, nunca
  commitada), util caso um dia seja acessado de outro dispositivo na rede.
- **Reativacao automatica por data.** Ao marcar alguem como ausente, e
  possivel informar uma data de retorno; o sistema reativa sozinho a pessoa
  no rodizio quando a data chegar (comparando com a data atual a cada
  verificacao do bot). Reativacao manual antecipada tambem continua possivel.

## Funcionalidades

1. **Gestao de atendentes na fila**
   - Listar todos os atendentes do rodizio com status (ativo/inativo)
   - Marcar como inativo com motivo (falta, ferias, etc.) e data de retorno
     opcional
   - Reativar manualmente a qualquer momento
   - Reordenar ou adicionar/remover atendentes definitivamente (ajuste raro,
     mas util se alguem sair do time ou entrar)
2. **Visualizacao do rodizio**
   - Quem e o proximo atendente ativo na fila
   - Ordem completa, com destaque pra quem esta inativo no momento
3. **Historico de encaminhamentos**
   - Tabela a partir do `state/encaminhamentos.log` (chamado, cliente,
     atendente, data/hora)
4. **Status da automacao**
   - Ultima verificacao executada, proxima prevista, ultimo erro (se houve)
   - O bot (`index.ts`) passa a escrever um `state/status.json` a cada ciclo
     para o dashboard exibir isso
5. **Configuracoes basicas**
   - Intervalo de verificacao (minutos) e limite de SLA de Encaminhamento
     (minutos), hoje fixos no `.env`/`config.ts`, passam a ser editaveis
     pela UI e persistidos em `state/configuracoes.json` (o bot le esse
     arquivo a cada ciclo, com fallback pros valores do `.env`)
6. **Acao manual "Forcar verificacao agora"**
   - Dispara imediatamente uma passada do fluxo (lista + SLA + atribuicao +
     notificacao Teams), sem esperar o proximo ciclo agendado

## Mudancas de arquitetura necessarias

- Migrar a lista fixa de atendentes (hoje hardcoded em `config.ts`) para um
  arquivo editavel `state/atendentes.json`, schema proposto:
  ```json
  [
    {
      "nome": "Mateus Ricardo",
      "codigoAtendente": 9,
      "ativo": true,
      "motivoInatividade": null,
      "retornaEm": null
    }
  ]
  ```
- `rotation.ts` passa a pular atendentes com `ativo: false` ao calcular o
  proximo da fila, mantendo a ordem original de cadastro
- Antes de cada verificacao, o bot confere se algum `retornaEm` ja passou e
  reativa automaticamente (`ativo: true`, limpa `motivoInatividade`/`retornaEm`)
- `index.ts` passa a escrever `state/status.json` a cada ciclo (sucesso,
  horario, proximo horario previsto, ultimo erro)
- Novo `state/configuracoes.json` para os parametros hoje fixos
  (`pollIntervalMinutes`, `encaminhamentoLimiteMinutos`), com fallback para o
  `.env`/valores padrao se o arquivo nao existir

## Stack proposta

- **Servidor:** Express (Node), endpoints REST:
  - `GET/PATCH /api/atendentes` - listar e editar status
  - `GET /api/rotation` - ordem atual e proximo
  - `GET /api/log` - historico de encaminhamentos
  - `GET /api/status` - status da automacao
  - `GET/PATCH /api/configuracoes` - parametros ajustaveis
  - `POST /api/verificar-agora` - dispara uma passada imediata
  - Login simples via cookie de sessao + senha do `.env` (sem tabela de
    usuarios, sem OAuth - proporcional ao uso pessoal)
- **Frontend:** HTML + JS simples (sem framework/build step), servido como
  estatico pelo proprio Express - consistente com o espirito de ferramenta
  pessoal enxuta do projeto
- Roda em `localhost` (porta propria, ex. 3001), processo separado
  (`npm run dashboard`), iniciado manualmente quando o usuario quiser
  administrar a fila

## Fases de implementacao propostas

1. Migrar atendentes de `config.ts` para `state/atendentes.json` + ajustar
   `rotation.ts` (pular inativos, reativacao automatica por data)
2. Backend Express com os endpoints de atendentes/rotation/log/status
3. Frontend: tela de lista de atendentes (toggle ativo/inativo, motivo, data
   de retorno) + historico + status
4. Login por senha
5. Configuracoes ajustaveis (intervalo, limite de SLA) + acao "forcar
   verificacao agora"

## Pendencias / a confirmar com o usuario antes de implementar

- [x] Aprovar este plano
- [x] Porta do dashboard: 3001
- [x] Senha inicial do dashboard (salva em `.env` como `DASHBOARD_PASSWORD`)

## Status: implementado e validado (2026-07-14)

Todas as 5 fases foram implementadas:

- `src/atendentes.ts`, `state/atendentes.json` - fonte da verdade dos
  atendentes, com ativo/inativo, motivo e reativacao automatica por data
- `src/rotation.ts` reescrito - pula inativos, mantem ordem fixa, guarda
  `ultimoAtendente` (nao mais indice) para nao se perder quando alguem e
  ativado/desativado
- `src/fluxo.ts` - logica compartilhada entre o loop continuo (`index.ts`) e
  o botao "Forcar verificacao agora" do dashboard
- `src/status.ts` / `src/configuracoes.ts` - persistidos em
  `state/status.json` e `state/configuracoes.json`
- `src/dashboard/server.ts` + `public/*` - servidor Express com login por
  senha (cookie httpOnly), todos os endpoints da API e frontend simples sem
  build step
- Testado ponta a ponta no navegador: login, status, rodizio, ativar/reativar
  atendente (Mateus Ricardo, ida e volta), configuracoes preenchidas,
  historico completo carregado a partir do log real
- **Nao testado**: botao "Forcar verificacao agora" (dispara acao real no
  SoftDesk - requer aprovacao explicita antes de rodar, mesma regra das
  outras acoes reais do bot)

Como rodar: `npm run dashboard` (porta 3001, senha em `DASHBOARD_PASSWORD` no
`.env`)
