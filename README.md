# SoftDesk HCM Bot — Rodízio automático de chamados

Automação pessoal que monitora a fila **"Sem atendente"** do SoftDesk (sistema
de chamados/suporte da Senior), e quando um chamado passa de **15 minutos**
sem ser encaminhado, atribui automaticamente ao próximo atendente de uma lista
fixa em rodízio — avisando o time no Microsoft Teams. Inclui um dashboard web
para gerenciar quem está ativo no rodízio (férias, faltas, etc).

Este documento é um guia de estudo: explica o que foi construído, por quê, e
como cada peça se encaixa.

## Contexto (por que existe)

O SoftDesk não tem uma opção nativa de "distribuir chamados sem atendente
automaticamente entre a equipe". O processo era manual: alguém precisava ficar
de olho na fila e encaminhar na mão. Este bot substitui essa checagem manual.

## Tecnologias utilizadas

| Tecnologia | Papel no projeto |
|---|---|
| **Node.js + TypeScript** | Runtime e linguagem de todo o projeto |
| **Playwright** | Automação de navegador (login no SoftDesk, preenchimento de formulários) e cliente HTTP (chamadas diretas à API JSON do SoftDesk) |
| **Express** | Servidor web do dashboard de administração |
| **HTML + CSS + JavaScript puro** | Frontend do dashboard (sem framework, sem build step) |
| **cookie-parser** | Sessão de login simples do dashboard (cookie httpOnly) |
| **dotenv** | Carrega credenciais/segredos do arquivo `.env` |
| **Windows Task Scheduler** | Agendamento — dispara o bot a cada 5 min, seg-sex, 07:42-18:00 |
| **Microsoft Teams (Power Automate Workflows)** | Notificação de cada encaminhamento via webhook + Adaptive Card |

Não tem banco de dados: todo o estado (rodízio, atendentes, log, config) é
persistido em arquivos JSON simples dentro de `state/`. Para o volume e o
número de usuários deste projeto (uso interno de uma equipe pequena), isso é
suficiente e evita a complexidade de configurar/hospedar um banco.

## Arquitetura em 3 partes

```
┌─────────────────────┐     ┌──────────────────────┐     ┌─────────────────┐
│  Windows Task        │────▶│  Bot (rodar-uma-vez)  │────▶│  SoftDesk (real) │
│  Scheduler            │     │  1 passada e termina  │◀────│  API JSON + UI   │
│  a cada 5 min          │     └──────────┬───────────┘     └─────────────────┘
└─────────────────────┘                │                            │
                                          ▼                            ▼
                                ┌──────────────────┐          notificação
                                │  state/*.json     │          no Teams
                                │  (fonte da verdade)│
                                └──────────┬─────────┘
                                           ▲
                                           │ le/edita
                                ┌──────────┴─────────┐
                                │  Dashboard (Express) │
                                │  npm run dashboard   │
                                │  localhost:3001       │
                                └──────────────────────┘
```

O bot e o dashboard são **processos completamente independentes** — nunca
rodam no mesmo processo. Eles só se falam através dos arquivos em `state/`.
Isso significa que você pode desligar o dashboard a qualquer momento sem
afetar o bot, e vice-versa.

## Estrutura de arquivos

### Núcleo do fluxo (`src/`)

| Arquivo | Responsabilidade |
|---|---|
| `config.ts` | Le variaveis de ambiente do `.env` (credenciais, URLs, portas). Ponto central de configuração fixa. |
| `browser.ts` | Abre uma sessão do Playwright e faz login no SoftDesk como "Atendente". |
| `tickets.ts` | Fala com a **API JSON real** do SoftDesk (não faz scraping de HTML): lista chamados de "Sem atendente" e busca o SLA de "Encaminhamento" de um chamado especifico. |
| `sla.ts` | Função pura (`tempoDecorridoEmMinutos`) que converte o formato de tempo do SoftDesk (`"00:21"`) em minutos. Testável isoladamente. |
| `assign.ts` | O único módulo que **automatiza o navegador de verdade** (cliques, preenchimento de formulário) para encaminhar um chamado a um atendente. Todo o resto do projeto usa chamadas HTTP diretas; só a atribuição em si precisa de interação de UI porque o SoftDesk não expôs (que a gente tenha achado) uma API direta pra isso. |
| `atendentes.ts` | Fonte da verdade dos atendentes do rodízio (`state/atendentes.json`): ativar, desativar (com motivo/data de retorno), reativação automática por data. |
| `rotation.ts` | Decide quem é o próximo atendente ativo, pulando quem está inativo, mantendo a ordem fixa de cadastro. |
| `log.ts` | Grava cada encaminhamento real em `state/encaminhamentos.log` (texto simples, uma linha por evento). |
| `teams.ts` | Monta o Adaptive Card e envia ao webhook do Teams. Nunca lança exceção — falha aqui não pode derrubar o rodízio. |
| `configuracoes.ts` / `status.ts` | Parâmetros ajustáveis (intervalo, limite de SLA) e status da última execução — ambos lidos/escritos pelo dashboard e pelo bot. |
| `fluxo.ts` | **Orquestra tudo**: lista chamados → checa SLA → decide próximo atendente → atribui → loga → notifica. Usado tanto pelo loop contínuo quanto pelo botão do dashboard. |
| `index.ts` | Loop contínuo (`npm run dev`) — usado para desenvolvimento/teste manual, não para produção. |
| `rodar-uma-vez.ts` | Ponto de entrada usado pelo **Windows Task Scheduler**: roda uma passada e encerra o processo. |
| `run-once.ts` | Igual ao `rodar-uma-vez.ts`, mas com logs verbosos e screenshots — usado para depuração manual quando algo dá errado. |

### Dashboard (`src/dashboard/` + `public/`)

| Arquivo | Responsabilidade |
|---|---|
| `dashboard/server.ts` | Servidor Express: login por senha, e endpoints REST (`/api/atendentes`, `/api/rotation`, `/api/log`, `/api/status`, `/api/configuracoes`, `/api/verificar-agora`). |
| `dashboard/auth.ts` | Login simples: senha do `.env` gera um token de sessão guardado em memória + cookie httpOnly. Sem tabela de usuários, sem OAuth — proporcional ao uso (equipe pequena). |
| `dashboard/logHistorico.ts` | Le e interpreta `state/encaminhamentos.log` como dados estruturados pra exibir em tabela. |
| `public/index.html`, `public/app.js`, `public/style.css` | Frontend simples (HTML+JS puro, sem React/build step) que consome a API acima. |

### Raiz do projeto

| Arquivo | Papel |
|---|---|
| `executar-tarefa.cmd` | Script que o Windows Task Scheduler chama: seta `PLAYWRIGHT_BROWSERS_PATH=0` (ver "Decisões de design" abaixo) e roda `node dist/rodar-uma-vez.js`, redirecionando toda saída pra `state/task-output.log`. |
| `PLANO-TEAMS.md`, `PLANO-DASHBOARD.md` | Planejamento original de cada feature, com decisões tomadas e status de implementação — útil pra entender o "porquê" por trás de cada escolha. |
| `.env` / `.env.example` | Segredos (nunca commitados) e o template do que precisa ser configurado. |

## Como o SoftDesk é acessado (engenharia reversa)

O SoftDesk é uma SPA (aplicação de página única). Em vez de raspar HTML (frágil),
descobrimos e usamos a API JSON real que o próprio front-end do SoftDesk chama:

- **Listar fila "Sem atendente":**
  `GET /chamado/json?cd_pasta=13&tp_requisicao=SEM_ATENDENTE&tp_usuario=ATE&...`
  → retorna `{ lista: [...] }` com todos os campos do chamado (`cd_chamado`,
  `tt_chamado`, `nm_cliente`, `cd_servico`, datas de criação, etc.)

- **Detalhe/SLA de um chamado:**
  `POST /chamado/detalhe/{id}/json` (precisa de header `X-CSRF-TOKEN`, obtido
  da tag `<meta name="csrf-token">` da página) → retorna
  `sla.sla[]`, uma lista de `{ nome: "Encaminhamento", decorrido: "00:21", ... }`
  já calculada pelo servidor. `sla.ts` converte esse `"00:21"` em minutos.

- **Atribuição de fato:** aqui não achamos uma API direta — é feita via
  automação de UI real (`assign.ts`): abre o chamado, clica no botão
  "Encaminhar chamado", seleciona o atendente num `<select>` (widget
  bootstrap-select), preenche os campos obrigatórios do registro de atividade
  (tipo de atividade, tempo gasto, "solicitante visualiza"), e clica Salvar.
  Depois de salvar, o código **confere se a tela realmente fechou** (sem erro
  de validação visível) antes de considerar sucesso — isso foi adicionado
  depois de um bug real onde "Salvar" falhava silenciosamente por falta de
  campo obrigatório, e o bot achava que tinha dado certo.

## Fluxo principal, passo a passo (`fluxo.ts`)

1. Lê configurações atuais (`configuracoes.ts`) — intervalo e limite de SLA
2. Abre sessão no SoftDesk (`browser.ts`)
3. Lista chamados de "Sem atendente", ordenados do mais antigo pro mais novo
4. Para cada chamado, busca o SLA de Encaminhamento real
5. Se `< 15 min` (configurável), pula
6. Se `>= 15 min`: pega o próximo atendente **ativo** do rodízio (sem
   avançar o ponteiro ainda!)
7. Tenta atribuir de verdade (`assign.ts`)
8. **Só se a atribuição foi confirmada com sucesso**: avança o rodízio, grava
   no log, notifica o Teams
9. Grava `state/status.json` com o resultado da execução (sucesso/erro)

O passo 6/8 separados (`atendenteAtual()` vs `avancarRodizio()`) é uma decisão
de design importante: evita que o rodízio avance pra alguém que na verdade
não recebeu o chamado, caso a atribuição falhe no meio do caminho.

## Decisões de design (o "porquê")

- **Sem banco de dados** — arquivos JSON bastam pro volume/usuários deste
  projeto, e evitam configurar/hospedar/manter um banco externo.
- **API direta pra leitura, automação de UI só pra escrever** — mais rápido e
  confiável (não depende de seletores CSS frágeis), reservando a automação de
  navegador só pra parte que realmente precisa (a atribuição em si).
- **Confirmação pós-Salvar** — nunca assume sucesso; sempre confere a tela
  depois de qualquer ação real, porque já tivemos um caso real de falso
  positivo (a atribuição "parecia" ter funcionado mas na real o formulário
  tinha voltado com erro de validação).
- **`PLAYWRIGHT_BROWSERS_PATH=0`** — o Playwright guarda o Chromium baixado
  na pasta de perfil do Windows por padrão (`%LOCALAPPDATA%`). Rodando via
  Task Scheduler no modo S4U (ver abaixo), o perfil do usuário não é
  totalmente carregado, e o navegador não era encontrado. Configurando essa
  variável, o Chromium fica dentro do próprio projeto
  (`node_modules/playwright-core/.local-browsers`), sem depender de nada
  ligado ao perfil do usuário.
- **Modo de logon S4U na tarefa agendada** — permite rodar mesmo com o
  usuário deslogado, sem precisar guardar a senha do Windows no Task
  Scheduler (ao contrário do modo "Password"). Efeito colateral bom: roda
  sem nenhuma janela visível na tela.
- **Dashboard sem framework** — HTML/JS puro, sem React/Vue/build step,
  proporcional ao tamanho da interface (algumas telas simples).
- **Bot e dashboard como processos separados** — um bug no dashboard não
  pode derrubar o monitoramento automático, e vice-versa.

## Como rodar

```bash
npm install                    # instala dependencias
npx playwright install chromium  # baixa o Chromium (so 1a vez)
npm run build                  # compila TypeScript -> dist/

npm run dev                     # loop continuo (teste manual, nao produção)
npm run rodar                   # uma passada so (mesma logica do Task Scheduler)
npm run dashboard                # sobe o dashboard em localhost:3001
```

Em produção, quem dispara o bot é a tarefa agendada do Windows
(`SoftdeskRodizioHCM`), executando `dist/rodar-uma-vez.js` via
`executar-tarefa.cmd` a cada 5 minutos, seg-sex, das 07:42 às 18:00.

## Configuração (`.env`)

| Variável | Para que serve |
|---|---|
| `SOFTDESK_EMAIL` / `SOFTDESK_PASSWORD` | Login no SoftDesk |
| `TEAMS_WEBHOOK_URL` | URL do workflow do Power Automate (canal "Revezamento de chamados") |
| `DASHBOARD_PORT` / `DASHBOARD_PASSWORD` | Porta e senha do dashboard |
| `POLL_INTERVAL_MINUTES` / `HEADLESS` | Usados só pelo `npm run dev` (loop contínuo de teste) |

## Limitações conhecidas

- Não há filtro por categoria de chamado — processa **tudo** que estiver em
  "Sem atendente" nesta conta, já que a conta só enxerga chamados do HCM
  mesmo (decisão tomada depois de descobrir que o filtro por `cd_servico`
  original era grande demais e excluía chamados válidos de outro serviço
  dentro do próprio HCM).
- O rodízio não sabe, por si só, quando alguém recebe um chamado
  **manualmente** (fora do bot) — se isso acontecer, é preciso ajustar
  `state/rotation.json` (`ultimoAtendente`) na mão.
- Se a tarefa agendada precisar ser **recriada** (deletada e criada de novo)
  no futuro, ela volta pro modo de logon padrão ("Interativo apenas") e é
  preciso reaplicar o S4U manualmente (comando documentado no histórico do
  projeto) — o `schtasks /create` não aceita esse modo direto pela linha de
  comando sem elevação.
