# SoftDesk HCM Bot

[![Deploy](https://github.com/felipedefendi/softdesk-hcm-bot/actions/workflows/deploy.yml/badge.svg)](https://github.com/felipedefendi/softdesk-hcm-bot/actions/workflows/deploy.yml)

Automação de rodízio de chamados para o **SoftDesk** (sistema de chamados da **Senior**), construída para resolver um problema real do time de suporte HCM onde trabalho: chamados sem atendente ficavam parados na fila até alguém perceber manualmente e distribuir.

O bot monitora a fila **"Sem atendente"** e, quando um chamado passa de 15 minutos sem ser encaminhado, atribui automaticamente ao próximo atendente disponível de uma lista em rodízio — notificando o time no Microsoft Teams. Inclui um dashboard web para gerenciar a equipe e relatórios automáticos com o panorama dos chamados.

Rodando em produção 24/7 numa VM na nuvem, agindo em tempo real sobre o sistema real da equipe.

## Funcionalidades

- Monitora a fila sem atendente, verifica o SLA e atribui ao próximo do rodízio, pulando quem está ausente — com reativação automática na data de retorno
- Notifica no Teams a cada atribuição, com menção real (@) ao atendente, link do chamado e dados do solicitante. Encaminhamentos da mesma execução vão numa mensagem só, na ordem certa
- Dashboard web protegido por senha, com sete telas: fila ao vivo com SLA regressivo, saúde do bot, histórico, gestão da equipe com rodízio reordenável, cofre e configurações
- Cofre de credenciais de clientes cifradas (AES-256-GCM), com destrave temporário separado da sessão do painel
- Relatórios automáticos no Teams — diário, semanal e mensal: volume, tendência, clientes que mais abriram chamado, curva ABC e prioridade. Sempre sobre a fila, nunca por atendente
- Alerta de rodízio travado quando um atendente ativo passa dias sem receber, sem virar comparação de produtividade
- Interface responsiva com tema claro/escuro, e log completo de auditoria de todas as atribuições

## Arquitetura

```
┌──────────────┐     ┌──────────────────────┐     ┌─────────────────┐
│ Agendador     │────▶│  Bot (1 passada)      │────▶│  SoftDesk (real) │
│ (a cada 5 min)│     │                       │◀────│  API JSON        │
└──────────────┘     └──────────┬───────────┘     └─────────────────┘
                                    │                            │
                                    ▼                            ▼
                          ┌──────────────────┐          notificação
                          │  Estado (JSON)     │          no Teams
                          └──────────┬─────────┘
                                     ▲
                                     │
                          ┌──────────┴─────────┐
                          │  Dashboard (Express) │
                          │  gestão da equipe     │
                          └──────────────────────┘
```

Bot e dashboard são processos independentes, comunicando-se só através de arquivos de estado — uma falha em um não derruba o outro. Sem banco de dados: o volume de uma equipe pequena não justifica a complexidade de hospedar e manter um.

## Stack técnica

| Tecnologia | Uso |
|---|---|
| **Node.js + TypeScript** | Runtime e linguagem de todo o projeto |
| **Playwright** (modo API, sem navegador) | Cliente HTTP com gestão automática de cookies, usado pra autenticar e consumir a API interna do SoftDesk |
| **Express** | API REST do dashboard |
| **React + Vite + TypeScript** | Frontend do dashboard — CSS Modules e tokens de tema em CSS puro, sem framework de UI |
| **Vitest** + runner nativo do Node | Testes das funções puras do frontend e do bot |
| **systemd** | Agendamento do bot e supervisão do dashboard em produção |
| **nginx + Let's Encrypt** | Proxy reverso e HTTPS do dashboard público |
| **GitHub Actions** | Deploy contínuo: push na `main` testa, compila e publica na VM |
| **Microsoft Teams** (Power Automate) | Notificações via webhook + Adaptive Cards |

## Desafios técnicos

Alguns problemas que valeram mais do que o código que os resolveu:

- **API não documentada, tudo por engenharia reversa**: o SoftDesk é uma SPA sem API pública. Login, listagem, checagem de SLA e a atribuição em si rodam via chamadas HTTP diretas à API JSON interna — a mesma que o próprio front-end usa —, sem abrir navegador. A atribuição precisou reconstruir o payload completo esperado pelo endpoint de salvar, lendo o estado atual do chamado imediatamente antes de escrever. O projeto rodou em produção com automação de navegador antes disso; a troca foi validada com um chamado real controlado antes de eu confiar no caminho novo.

- **Um cookie de sessão vazando pelo caminho do erro**: numa queda real de conexão durante os testes, apareceu que o cliente HTTP anexa o log completo da requisição na mensagem da exceção — cookies de sessão inclusive. Como eu usava essa mensagem no log e no card de falha, o segredo iria para o disco da VM e para dentro de uma mensagem no Teams. A mensagem passou a ser cortada na primeira linha, com um teste que falha se um cookie voltar a aparecer.

- **A regra de segurança que me trancou do lado de fora**: restringir SSH a um único IP de origem parecia óbvio, e o teste feito na hora passou. Só que aquele IP era dinâmico. Quando mudou, o acesso à VM de produção deixou de existir — e alterar a regra exigia um shell que só a própria regra concedia. Esgotei os caminhos de recuperação (console serial, GRUB, rede privada de outra instância, disco anexado noutra VM) e recriar saiu mais barato que recuperar. A lição não é "não restrinja o acesso", é **onde** colocar o controle: no firewall da nuvem, editável por painel web, e não dentro da máquina, onde a regra e o meio de alterá-la dependem um do outro. A produção seguiu no ar o tempo todo — o que caiu foi minha capacidade de mexer nela.

- **Uma métrica que decidi não construir**: a primeira versão do relatório teria "quantos chamados cada atendente recebeu". Cortei antes da primeira linha de código. Um relatório recorrente que compara pessoas vira placar de produtividade e recria exatamente o atrito que o rodízio automático existe para eliminar. O atendente continua no log — rodízio e auditoria dependem disso —, mas nenhum relatório agrupa por pessoa.

- **O histórico já existia, só não onde eu procurava**: o plano era gravar dados a cada execução e esperar semanas até ter volume para relatar. Antes disso, a engenharia reversa da tela de pesquisa revelou um endpoint que aceita intervalo de datas arbitrário — o histórico inteiro estava no próprio SoftDesk, consultável retroativamente. Isso eliminou a etapa de coleta e um arquivo de estado que nunca precisou existir.

- **Ordem das notificações fora do controle da aplicação**: com dois ou mais chamados na mesma execução, as mensagens chegavam ao Teams fora de ordem, mesmo o bot enviando sequencialmente e aguardando cada resposta. A causa não estava no envio: o Power Automate trata cada disparo do webhook como execução assíncrona independente. Em vez de contornar com atrasos, que só reduziriam a probabilidade, os encaminhamentos passaram a ir num disparo único com uma seção por chamado — sendo uma mensagem só, a ordem é garantida por construção.

- **O deploy que era feito pela metade**: publicar envolvia seis passos em duas máquinas, cada um óbvio isoladamente e por isso mesmo fácil de pular. Percebi ao conferir o estado real da VM: o frontend publicado era de um commit e o código-fonte de lá estava dois commits atrás, porque o `git pull` nunca tinha entrado na rotina. Automatizar não foi para economizar digitação, foi para eliminar a possibilidade de fazer metade — com portões que recusam publicar código não commitado ou fora de sincronia, e conferência final pelo HTTPS público, porque quem diz a verdade sobre o que está no ar é o nginx, não o disco da VM.

## Segurança

- Segredos nunca versionados, carregados por variáveis de ambiente, com permissão de arquivo restrita ao dono na VM
- Acesso SSH só por chave, com bloqueio automático de IPs insistindo em login (SSH e dashboard)
- Dashboard com senha, HTTPS, limite de tentativas por IP e cookies `httpOnly`/`secure` com expiração
- Credenciais de clientes cifradas em repouso (AES-256-GCM), com destrave de 5 minutos separado da sessão do painel
- Cabeçalhos HTTP de segurança, atualizações do sistema aplicadas automaticamente, backup diário do estado e rotação de logs

## Como rodar localmente

```bash
npm install
npm run build

npm run dev          # loop continuo do bot
npm run rodar        # uma passada so
npm run dashboard    # backend do dashboard em localhost:3001
npm test             # testes do bot

npm run dev:web      # frontend em localhost:5173, com proxy de /api
npm run build:web    # build de producao, sai em public/
npm run test:web     # testes do frontend
```

Requer um `.env` com as credenciais do SoftDesk — ver `.env.example`. A chave do cofre é opcional: sem ela, só a tela de credenciais fica indisponível. `public/` é artefato de build e não fica versionado.

## Estrutura do projeto

```
src/
├── sessao.ts, tickets.ts, assign.ts   # API direta do SoftDesk (sem navegador)
├── rotation.ts, atendentes.ts          # rodizio e gestao da equipe
├── fluxo.ts                             # orquestracao de uma passada
├── cofre/                                # cifragem e credenciais
├── relatorios/                            # metricas e datas (funcoes puras + testes)
└── dashboard/                              # API do painel
web/                                        # frontend (React + Vite + TypeScript)
├── src/paginas/                            # uma pasta por tela
├── src/hooks/                              # acesso a dados, sem estado global
└── src/lib/                                # funcoes puras, com teste
```

## Autor

Felipe Prado — [github.com/felipedefendi](https://github.com/felipedefendi)
