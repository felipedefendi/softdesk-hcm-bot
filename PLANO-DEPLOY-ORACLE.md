# Plano: Deploy do bot + dashboard na Oracle Cloud (Always Free)

## Objetivo

Hospedar o bot e o dashboard numa VM da Oracle Cloud (tier Always Free) para
que o dashboard fique acessivel a outros colaboradores pela internet, sem
nunca interromper o funcionamento atual no PC local do Felipe ate a nuvem
estar validada e assumir de vez.

## Decisoes ja tomadas

- **Shape da instancia: Ampere A1 (ARM), 2 OCPU / 12GB RAM.** Dentro do limite
  Always Free (ate 4 OCPU / 24GB no total). Muito mais folga que o shape
  AMD Micro (1GB RAM), que seria arriscado rodar Chromium + Node + Express ao
  mesmo tempo. Unico cuidado extra: o Playwright precisa do build de
  Chromium para `linux-arm64` (existe e funciona, so exige instalar com
  `npx playwright install --with-deps chromium` numa distro Ubuntu/Debian
  suportada).
- **Sem dominio proprio - usar DuckDNS.** DuckDNS da um subdominio gratuito
  (ex: `softdesk-hcm.duckdns.org`) apontando pro IP publico da VM, o que
  permite gerar certificado real via Let's Encrypt/certbot (HTTPS valido, sem
  aviso de seguranca no navegador). Certbot nao emite certificado para IP
  puro, entao um nome de dominio (mesmo gratuito) e necessario.
- **Corte em duas etapas, nunca em paralelo real.** O bot da nuvem sobe
  primeiro em **modo dry-run** (le a fila e o SLA, calcula quem seria o
  proximo atendente, escreve tudo num log separado - mas NUNCA abre o painel
  "Encaminhar chamado" nem clica em Salvar). O bot do Windows continua sendo
  o unico que executa acoes reais ate o dry-run da nuvem ser validado por
  alguns dias (comparando os dois logs). So depois disso desativamos a task
  do Windows e promovemos a nuvem a modo real.

## Arquitetura alvo

```
VM Oracle (Ubuntu, Ampere A1)
+-- softdesk-hcm-bot/            (mesmo repo, clonado via git)
|   +-- .env                     (nao versionado, copiado manualmente)
|   +-- state/*.json             (fonte da verdade unica, na nuvem)
|   +-- dist/                    (build de producao, npm run build)
+-- systemd
|   +-- softdesk-bot.service + softdesk-bot.timer   (substitui o Task Scheduler)
|   +-- softdesk-dashboard.service                  (Express sempre rodando)
+-- nginx (reverse proxy)
|   +-- certbot/Let's Encrypt (via DuckDNS)          -> HTTPS na porta 443
|   +-- proxy_pass -> localhost:3001 (dashboard)
+-- ufw (firewall do SO)          libera 443 (e 80 so p/ desafio do certbot) e 22 (SSH)
Oracle VCN Security List          mesma liberacao (443/80/22) no nivel de rede
```

Depois do corte, o PC local do Felipe deixa de rodar o bot (Task Scheduler
desativado); o dashboard so existe na nuvem, com o mesmo `state/*.json` que o
bot da nuvem le e escreve - sem duplicidade de estado.

## Fases propostas

1. **Provisionar a VM**
   - Criar a instancia Ampere A1 (Ubuntu), gerar/baixar a chave SSH, liberar
     porta 22 (SSH), 80 e 443 na Security List da VCN.
   - Verificar: `ssh` na VM funciona a partir do PC do Felipe.

2. **Preparar o ambiente**
   - Instalar Node.js (versao compativel com o `package.json`), git, nginx,
     certbot.
   - Clonar o repositorio, `npm install`, `npx playwright install --with-deps
     chromium`, `npm run build`.
   - Copiar `.env` manualmente (nunca via git) com `HEADLESS=true` e o mesmo
     `PLAYWRIGHT_BROWSERS_PATH=0`.
   - Verificar: `npm run build` sem erro; `node dist/rodar-uma-vez.js` roda
     manualmente sem travar no login do SoftDesk (aqui e onde descobrimos se
     o SoftDesk bloqueia/desconfia de login vindo de IP de datacenter - risco
     relevante, ver secao de riscos).

3. **Modo dry-run do bot na nuvem**
   - Adicionar uma flag (`DRY_RUN=true` no `.env`) que faz o `fluxo.ts` fazer
     tudo (listar, checar SLA, calcular o atendente) mas pular
     `atribuirChamado`/`avancarRodizio`/notificacao Teams reais, so logando
     "teria atribuido o chamado X para Y" num arquivo separado
     (`state/dry-run.log`).
   - Configurar `systemd timer` rodando de 5 em 5 minutos, Seg-Sex, no
     horario comercial (a ser confirmado - ver pendencias).
   - Verificar: comparar `state/dry-run.log` da nuvem com
     `state/encaminhamentos.log` real do Windows por alguns dias -  o
     atendente calculado deve bater sempre.

4. **Dashboard acessivel aos colaboradores**
   - Subir `softdesk-dashboard.service` (systemd, sempre ativo, restart
     automatico).
   - Nginx como reverse proxy + certbot/DuckDNS para HTTPS.
   - Trocar a senha do dashboard antes de expor publicamente (a atual foi
     pensada so pra uso local).
   - Verificar: acessar `https://<subdominio-duckdns>.duckdns.org` de fora da
     rede local, login funcionando, cadeado valido no navegador.
   - Nesse momento o dashboard da nuvem ainda mostra o estado *observado* pelo
     bot em dry-run (rodizio nao avanca de verdade) - deixar claro pros
     colaboradores que e uma previa, nao a fila real, ate o corte da fase 5.

5. **Corte (cutover)**
   - Copiar o `state/atendentes.json` e `state/rotation.json` atuais
     (do Windows) para a nuvem, substituindo os de teste - preserva
     continuidade do rodizio real.
   - Desativar a task do Windows Task Scheduler.
   - Tirar o bot da nuvem do modo dry-run (`DRY_RUN=false`).
   - Verificar: proxima atribuicao real acontece via nuvem, aparece no
     dashboard publico e no Teams normalmente.

6. **Pos-corte**
   - Manter o projeto local no PC do Felipe intacto por um tempo (rollback
     rapido se algo falhar na nuvem), so sem a task agendada ativa.
   - Atualizar o `README.md` com a nova forma de rodar/monitorar.

## Riscos e o que fica em aberto

- **SoftDesk pode reagir diferente a um login vindo de IP de datacenter**
  (bloqueio, captcha, 2FA) - so descobrimos testando na fase 2; se acontecer,
  pode inviabilizar rodar o bot fora da rede/IP residencial do Felipe.
- **Chromium em ARM64**: funciona, mas e menos testado que x86 - se der
  problema de instalacao, shape alternativo seria migrar pra AMD (só teria
  a opcao Micro de 1GB no Always Free, mais apertada).
- **Senha do dashboard**: hoje e uma senha unica simples, pensada pra uso
  pessoal na rede local. Exposta na internet publica, vale trocar por algo
  mais forte antes da fase 4 (ainda sem MFA/usuarios - fora de escopo pelo
  tamanho do projeto).

## Pendencias / a confirmar com o Felipe antes de implementar

- [x] Aprovar este plano
- [x] Shape da instancia: Ampere A1, 2 OCPU / 12GB
- [x] Sem dominio proprio -> usar DuckDNS
- [x] Estrategia de corte: dry-run primeiro, sem paralelismo real
- [ ] Confirmar acesso SSH a VM ja criada (IP publico, usuario do SO, chave
      `.pem` baixada) para eu conseguir configurar remotamente
- [ ] Horario exato do dry-run/producao na nuvem (manter 07:42-18:00 ou
      simplificar pra marcas redondas de 5 em 5 min, ex. 07:00-18:00?)
- [ ] Nova senha do dashboard antes de expor publicamente

## Status: planejado, nao implementado

Nenhuma acao real foi tomada ainda. Proximo passo, quando o Felipe confirmar
as pendencias acima, e comecar pela Fase 1 (provisionar a VM).
