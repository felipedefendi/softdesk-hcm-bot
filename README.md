# SoftDesk HCM Bot

Automação de rodízio de chamados para o **SoftDesk** (sistema de chamados/suporte da **Senior**), construída para resolver um problema real do time de suporte HCM onde trabalho: chamados sem atendente ficavam parados na fila até alguém perceber manualmente e distribuir.

O bot monitora a fila **"Sem atendente"**, e quando um chamado passa de 15 minutos sem ser encaminhado, atribui automaticamente ao próximo atendente disponível de uma lista em rodízio — notificando o time no Microsoft Teams. Inclui um dashboard web para gerenciar quem está ativo no rodízio (férias, faltas, ajustes de configuração) e um relatório diário automático com o panorama dos chamados do dia.

Rodando em produção 24/7 numa VM na nuvem (Oracle Cloud), monitorando e agindo em tempo real sobre o sistema real da equipe.

## Funcionalidades

- Monitoramento contínuo da fila de chamados sem atendente, com verificação de SLA
- Atribuição automática por rodízio, pulando atendentes marcados como ausentes
- Reativação automática de atendentes por data de retorno (fim de férias, etc.)
- Notificação em tempo real no Microsoft Teams a cada atribuição, mencionando (@) o atendente e trazendo link do chamado, dados do solicitante e contato clicável
- Encaminhamentos de uma mesma execução agrupados numa única mensagem, preservando a ordem em que foram atribuídos
- Dashboard web protegido por senha, com sete telas (visão geral, fila ao vivo, rodízio & equipe, histórico, saúde do bot, cofre, configurações), ordem do rodízio ajustável (drag-and-drop no desktop, setas no celular) e tema claro/escuro
- Tela "Fila ao vivo" com contagem regressiva de SLA por chamado e "Saúde do bot" com linha do tempo das execuções e alerta de atraso — pra responder "está tudo bem?" sem abrir log nenhum
- Cofre de senhas de clientes cifradas (AES-256-GCM), com destrave temporário e separado da sessão do painel — ver "Desafios técnicos"
- Interface responsiva, usável de verdade pelo celular
- Log completo de auditoria de todas as atribuições feitas
- Relatório diário automático no Teams (dias úteis, 17:45) com volume do dia, comparação com a média recente, situação dos chamados e faixa horária de pico
- Relatório semanal (sextas) e mensal (dia 1º) na mesma mensagem do diário: volume e tendência, clientes que mais abriram chamado, distribuição por curva ABC e prioridade — sempre sobre a fila, nunca por atendente
- Aviso explícito quando o relatório não pôde ser gerado, para que o silêncio nunca seja confundido com "dia sem chamado"
- Alerta no dashboard quando um atendente ativo passa dias sem receber chamado — sinaliza um possível rodízio travado sem virar comparação de produtividade

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
| **React + Vite + TypeScript** | Frontend do dashboard — CSS Modules com tokens de tema em CSS puro, sem framework de UI |
| **Vitest** | Testes das funções puras do frontend (o bot usa o runner nativo do Node) |
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
- **O deploy que era feito pela metade**: publicar envolvia seis passos em duas máquinas — build do frontend no PC (o Vite não cabe em 1GB de RAM), `git pull` e compilação do backend na VM, cópia do build, limpeza e restart. Cada passo era óbvio isoladamente, e por isso mesmo era fácil pular um. A conta apareceu quando fui conferir o estado real da VM: o frontend publicado era de um commit e o código-fonte lá estava dois commits atrás, porque o `git pull` nunca tinha entrado na rotina. Nesse caso não houve consequência (os commits eram só de frontend), mas nada teria avisado se fossem de backend. O `deploy.ps1` transformou a sequência num comando com portões: recusa publicar se houver alteração sem commit ou se a branch estiver fora de sincronia com o `origin`, roda os testes antes de tocar na VM, guarda o que está no ar para rollback, e no fim confere pelo HTTPS público — não pelo disco da VM — se o bundle que subiu é o que o nginx está de fato servindo.
- **Ordem das notificações fora do controle da aplicação**: quando dois ou mais chamados eram encaminhados na mesma execução, as mensagens chegavam ao Teams fora de ordem — mesmo com o bot enviando sequencialmente e aguardando cada resposta. A causa não estava no envio: o Power Automate trata cada disparo do webhook como uma execução assíncrona independente, sem garantia de ordem entre elas. Em vez de contornar com atrasos (que só reduziriam a probabilidade), os encaminhamentos passaram a ser agrupados num único disparo, com uma seção por chamado — sendo uma mensagem só, a ordem é garantida por construção.
- **Uma métrica que eu decidi não construir**: a primeira versão do relatório teria "quantos chamados cada atendente recebeu". Cortei antes de escrever a primeira linha. Um relatório recorrente que compara pessoas vira placar de produtividade e recria exatamente o atrito que o rodízio automático existe para eliminar. O atendente continua sendo gravado no log (o rodízio e a auditoria dependem disso), mas nenhum relatório agrupa por pessoa: todas as métricas são sobre a fila, não sobre quem atende.
- **O histórico já existia — só não estava onde eu procurava**: o plano inicial era passar a gravar dados a cada execução e esperar semanas até ter volume para relatar. Antes disso, a engenharia reversa da tela de pesquisa revelou um endpoint que aceita intervalo de datas arbitrário: o histórico inteiro estava no próprio SoftDesk e podia ser consultado retroativamente. Isso eliminou a etapa de coleta e um arquivo de estado que nunca precisou existir. Como a resposta traz o total separado da página de resultados, as contagens saem com uma requisição de um registro só, em vez de baixar centenas.
- **Um cookie de sessão vazando pelo caminho do erro**: em uma queda real de conexão durante os testes, apareceu que o cliente HTTP anexa o log completo da requisição na mensagem da exceção — incluindo os cookies de sessão. Como eu usava essa mensagem tanto no log quanto no card de falha, o segredo iria para o disco da VM e para dentro de uma mensagem no Teams. A mensagem passou a ser cortada na primeira linha, com um teste que falha se um cookie voltar a aparecer no resumo.
- **Um cache que teria gravado senhas em disco**: o relatório mensal precisaria traduzir códigos de categoria em nomes, e o endpoint que faz esse dicionário devolve, no mesmo payload, a lista de atendentes — com hashes de senha e contatos. Cachear essa resposta em disco, como estava planejado, teria persistido credenciais em arquivo. Ao inspecionar o retorno real antes de implementar, descobri que a categoria nem vinha nesse endpoint: o cache inteiro era desnecessário. A funcionalidade foi cortada em vez de construída, e o dado sensível nunca tocou o disco.
- **Sucesso que o sistema lia como falha**: o relatório era enviado corretamente e ainda assim o processo terminava com código de erro — encerrar o programa explicitamente enquanto o cliente HTTP ainda fechava conexões derrubava o runtime. Como o agendador trata código diferente de zero como falha, o relatório apareceria como quebrado todos os dias e uma falha real ficaria enterrada no meio dos alarmes falsos. A correção foi deixar o processo terminar naturalmente.
- **Tabela de dados numa tela de celular**: a tabela de atendentes fazia a página rolar 184px na horizontal e deformava o botão de ação, porque a coluna de ação precisava caber um painel inteiro. Abaixo de 900px as tabelas passaram a virar cartões empilhados, com cada célula exibindo o próprio rótulo. E como o drag-and-drop nativo do HTML5 não responde a toque, a reordenação do rodízio no celular ganhou setas que reaproveitam o mesmo endpoint do arrastar.
- **Uma auditoria de segurança que virou ação, não relatório**: revisei a exposição real da VM (quem consegue se conectar hoje, com o quê) e priorizei os achados por impacto real dividido por esforço, não por categoria abstrata. Cada mudança foi testada antes de assumida como concluída: a nova regra de firewall restringindo SSH por IP foi trocada de forma atômica e testada com uma conexão nova antes de ser persistida, pra nunca correr o risco de perder acesso à própria VM. A prova de que a exposição era real, não teórica: assim que o bloqueio automático de tentativas de login entrou no ar, já encontrou e baniu IPs de scanners reais tentando força bruta contra o SSH. Uma dessas medidas acabou saindo cara — ver o item seguinte.
- **A regra de segurança que me trancou do lado de fora**: restringir SSH a um único IP de origem parecia a decisão óbvia, e o teste feito na hora passou. O que não considerei foi que aquele IP era dinâmico. Quando ele mudou, o acesso à VM de produção simplesmente deixou de existir — e mudar a regra exigia um shell que só a própria regra concedia. Esgotei os caminhos de recuperação: console serial (imagem de nuvem não tem senha, só chave), modo recovery do GRUB (`GRUB_TIMEOUT=0` nessas imagens), acesso pela rede privada a partir de outra VM na mesma subnet (a porta 22 estava fechada também por dentro) e anexar o disco de boot noutra instância (exigiria parar e desanexar a produção). Recriar a VM saiu mais barato que recuperá-la. A lição não é "não restrinja o acesso", é **onde** colocar o controle: no firewall da nuvem, editável por um painel web, e não dentro da máquina, onde a regra e o meio de alterá-la dependem um do outro. Durante todo o episódio a produção seguiu no ar — o que caiu foi só a minha capacidade de mexer nela.
- **Reescrever o frontend inteiro sem parar o bot em produção**: o dashboard migrou de JS puro pra React + Vite + TypeScript em fases — fundação, paridade de funcionalidade tela por tela contra a API real e só então o corte, trocando o que o Express serve pela saída do build. O painel antigo ficou no ar o tempo todo, então cada fase precisava terminar em algo que funcionasse de verdade, não só compilasse. O único bug real apareceu no corte: navegar direto pra uma rota interna (ou recarregar a página nela) devolvia 404, porque o roteamento client-side do React só existe depois do JavaScript carregar, e o Express não sabia disso — o dev server do Vite resolvia sozinho, produção não. Corrigido com um fallback de SPA no servidor.
- **Cofre de senhas: revelar é a exceção, não a regra**: cliente, sistema, link e validade de cada credencial ficam sempre visíveis e buscáveis sem senha nenhuma — só ver ou copiar login/senha exige um segundo destrave (a mesma senha do painel), com expiração própria de 5 minutos, verificada de novo no servidor a cada tentativa e independente da sessão de login. Login/senha nunca ficam em texto plano em disco (AES-256-GCM) nem aparecem na tela ao copiar: o valor vai direto pro clipboard.

## Segurança

- Segredos (credenciais, senha do dashboard) nunca versionados, carregados via variáveis de ambiente, com permissão de arquivo restrita ao dono na VM
- Acesso SSH à infraestrutura só por chave (nenhuma senha de usuário armazenada), com bloqueio automático de IPs insistindo em login (SSH e dashboard)
- Dashboard protegido por senha, HTTPS e limite de tentativas de login por IP
- Cookies de sessão `httpOnly` e `secure`, com expiração automática
- Credenciais de clientes cifradas em repouso (AES-256-GCM) no cofre, com destrave próprio de 5 minutos, separado da sessão do painel
- Cabeçalhos HTTP de segurança (proteção contra clickjacking, MIME-sniffing, HSTS)
- Atualizações de segurança do sistema operacional aplicadas automaticamente
- Backup diário do estado da aplicação, com rotação de logs pra não crescer indefinidamente

## Como rodar localmente

```bash
npm install
npm run build

npm run dev          # loop continuo do bot (desenvolvimento)
npm run rodar        # uma passada so
npm run dashboard    # backend do dashboard em localhost:3001
npm test             # testes do bot (runner nativo do Node)

npm run dev:web      # frontend do dashboard em localhost:5173, com proxy de /api
npm run build:web    # build de producao do frontend, sai em public/
npm run test:web     # testes do frontend (Vitest)

npm run relatorio -- --json    # gera o relatorio e imprime, sem enviar nada
npm run relatorio -- --teste   # envia para um canal de testes separado
```

Requer um arquivo `.env` com as credenciais do SoftDesk e demais configurações — ver `.env.example`. A chave do cofre é opcional: sem ela, só a tela de credenciais fica indisponível, o resto do bot funciona normal.

`public/` é artefato de build (gerado por `npm run build:web`), não fica versionado — o Express serve estático dali sem precisar de nenhuma mudança de código entre um build e outro.

## Estrutura do projeto

```
src/
├── sessao.ts        # login e sessao via API direta (Playwright em modo HTTP, sem navegador)
├── tickets.ts        # consumo da API JSON do SoftDesk
├── pesquisa.ts        # consulta de chamados por periodo, com paginacao
├── assign.ts           # atribuicao de chamado via API direta
├── rotation.ts          # logica do rodizio
├── atendentes.ts         # gestao de atendentes (ativo/inativo)
├── fluxo.ts                # orquestracao completa do fluxo
├── fila.ts                  # fila "sem atendente" sob demanda, so leitura, com cache
├── execucoes.ts               # historico de execucoes do bot
├── teams.ts                    # notificacao no Microsoft Teams
├── cofre/                       # cofre de senhas: cifragem, credenciais, catalogo de sistemas
├── relatorios/                   # metricas, datas e cards dos relatorios (funcoes puras + testes)
└── dashboard/                     # API do painel de administracao
web/                                # frontend do dashboard (React + Vite + TypeScript)
├── src/paginas/                    # uma pasta por tela da sidebar
├── src/hooks/                      # acesso a dados (fetch + polling), sem estado global
└── src/lib/                        # funcoes puras (calculo, formatacao, filtro), com teste
public/                             # build de producao do frontend (gerado, nao versionado)
```

## Autor

Felipe Prado — [github.com/felipedefendi](https://github.com/felipedefendi)
