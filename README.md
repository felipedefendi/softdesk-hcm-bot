# SoftDesk HCM Bot

Automação de rodízio de chamados para o **SoftDesk** (sistema de chamados/suporte da **Senior**), construída para resolver um problema real do time de suporte HCM onde trabalho: chamados sem atendente ficavam parados na fila até alguém perceber manualmente e distribuir.

O bot monitora a fila **"Sem atendente"**, e quando um chamado passa de 15 minutos sem ser encaminhado, atribui automaticamente ao próximo atendente disponível de uma lista em rodízio — notificando o time no Microsoft Teams. Inclui um dashboard web para gerenciar quem está ativo no rodízio (férias, faltas, ajustes de configuração).

Rodando em produção 24/7 numa VM na nuvem (Oracle Cloud), monitorando e agindo em tempo real sobre o sistema real da equipe.

## Funcionalidades

- Monitoramento contínuo da fila de chamados sem atendente, com verificação de SLA
- Atribuição automática por rodízio, pulando atendentes marcados como ausentes
- Reativação automática de atendentes por data de retorno (fim de férias, etc.)
- Notificação em tempo real no Microsoft Teams a cada atribuição
- Dashboard web protegido por senha para gestão da equipe e monitoramento
- Log completo de auditoria de todas as atribuições feitas

## Arquitetura

```
┌──────────────┐     ┌──────────────────────┐     ┌─────────────────┐
│ Agendador     │────▶│  Bot (1 passada)      │────▶│  SoftDesk (real) │
│ (a cada 5 min)│     │                       │◀────│  API JSON + UI   │
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

Bot e dashboard são processos independentes, comunicando-se só através de arquivos de estado — uma falha em um não derruba o outro. Roda em produção numa VM Linux (Oracle Cloud), com o bot agendado via `systemd timer` e o dashboard exposto publicamente com HTTPS (nginx + Let's Encrypt).

## Stack técnica

| Tecnologia | Uso |
|---|---|
| **Node.js + TypeScript** | Runtime e linguagem de todo o projeto |
| **Playwright** (modo API, sem navegador) | Cliente HTTP com gestão automática de cookies, usado pra autenticar e consumir a API interna do SoftDesk — sem abrir Chromium |
| **Express** | API REST do dashboard de administração |
| **systemd** | Agendamento do bot e supervisão do dashboard em produção |
| **nginx + Let's Encrypt** | Proxy reverso e HTTPS do dashboard público |
| **Microsoft Teams (Power Automate)** | Notificações via webhook + Adaptive Cards |

Sem banco de dados — o estado (rodízio, atendentes, logs) é persistido em arquivos JSON, suficiente para o volume de uma equipe pequena e evitando a complexidade de hospedar/manter um banco externo.

## Desafios técnicos

- **API não documentada, 100% via engenharia reversa**: o SoftDesk é uma SPA sem API pública. Todo o fluxo — login, listagem, checagem de SLA e a atribuição em si — roda via chamadas HTTP diretas à API JSON interna (a mesma que o próprio front-end usa), sem nunca abrir um navegador de verdade. A atribuição precisou reconstruir o payload completo esperado pelo endpoint de salvar (dezenas de campos), buscando o estado atual do chamado imediatamente antes de escrever para minimizar o risco de sobrescrever dados desatualizados.
- **Migração de UI para API em produção**: o projeto rodou em produção com automação de navegador (Playwright + Chromium) antes da migração para chamadas diretas. A troca foi validada com um chamado real controlado, conferindo o resultado no próprio SoftDesk antes de confiar no novo caminho.
- **Separação entre cálculo e efeito colateral**: a lógica de "quem é o próximo do rodízio" e a de "avançar o rodízio" são funções separadas, e a segunda só é chamada depois de uma atribuição confirmada — evita que o rodízio avance para alguém que não recebeu o chamado de fato.
- **Deploy sem custo, resiliente a reinício e sem expor senha do sistema**: publicado numa VM cloud gratuita, autenticando via chave SSH (sem senha de usuário armazenada), sobrevivendo a reinícios da máquina via `systemd`.
- **Validação segura antes de produção**: um modo de simulação (dry-run) permitiu validar a automação rodando na nuvem, sem tomar nenhuma ação real, até confirmar que o comportamento estava correto antes do corte definitivo.

## Segurança

- Segredos (credenciais, senha do dashboard) nunca versionados, carregados via variáveis de ambiente
- Acesso à infraestrutura só por chave SSH (sem autenticação por senha)
- Dashboard protegido por senha e HTTPS (certificado renovado automaticamente)
- Cookies de sessão `httpOnly`
- Atualizações de segurança do sistema operacional aplicadas automaticamente

## Como rodar localmente

```bash
npm install
npm run build

npm run dev         # loop continuo (desenvolvimento)
npm run rodar        # uma passada so
npm run dashboard     # dashboard em localhost:3001
```

Requer um arquivo `.env` com as credenciais do SoftDesk e demais configurações — ver `.env.example`.

## Estrutura do projeto

```
src/
├── sessao.ts        # login e sessao via API direta (Playwright em modo HTTP, sem navegador)
├── tickets.ts        # consumo da API JSON do SoftDesk
├── assign.ts          # atribuicao de chamado via API direta
├── rotation.ts         # logica do rodizio
├── atendentes.ts        # gestao de atendentes (ativo/inativo)
├── fluxo.ts               # orquestracao completa do fluxo
├── teams.ts                # notificacao no Microsoft Teams
└── dashboard/                # API + servidor do painel de administracao
public/                        # frontend do dashboard (HTML/CSS/JS)
```

## Autor

Felipe Prado — [github.com/felipedefendi](https://github.com/felipedefendi)
