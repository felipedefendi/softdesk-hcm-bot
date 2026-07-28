# Publica o backend e o painel na VM de producao.
#
# Substitui uma sequencia manual de seis passos que era facil de fazer pela
# metade: em 28/07/2026 a VM estava servindo o frontend de um commit e rodando
# o backend de outro, porque o "git pull" nunca tinha entrado na rotina.
#
# Configuracao por variavel de ambiente, pra nao fixar IP nem caminho de chave
# num repositorio publico (mesmo motivo do backup-state.ps1 estar no gitignore):
#
#   $env:SOFTDESK_VM      = "ubuntu@000.000.000.000"
#   $env:SOFTDESK_SSH_KEY = "C:\caminho\para\chave.key"
#   $env:SOFTDESK_URL     = "https://exemplo.duckdns.org"

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

# Vira $true no momento em que a VM passa a ser alterada. Sem isso a mensagem de
# aborto mente: falhar na conferencia final e muito diferente de falhar num
# portao, e quem esta lendo precisa saber se tem ou nao o que reverter.
$script:vmTocada = $false

function Abortar($mensagem) {
  Write-Host ""
  Write-Host "DEPLOY ABORTADO - $mensagem" -ForegroundColor Red
  if ($script:vmTocada) {
    Write-Host "A VM JA FOI ALTERADA. Para reverter tudo:" -ForegroundColor Yellow
    Write-Host "  ssh -i `"$chave`" $vm 'cd ~/softdesk-hcm-bot && git reset --hard `$(cat ~/commit-anterior.txt) && npm run build && rm -rf public && tar xzf ~/public-anterior.tar.gz && sudo systemctl restart softdesk-dashboard.service'" -ForegroundColor Yellow
  } else {
    Write-Host "Nada foi alterado na VM." -ForegroundColor Red
  }
  exit 1
}

function Etapa($numero, $titulo) {
  Write-Host ""
  Write-Host "[$numero/7] $titulo" -ForegroundColor Cyan
}

$vm = $env:SOFTDESK_VM
$chave = $env:SOFTDESK_SSH_KEY
$url = $env:SOFTDESK_URL

if (-not $vm -or -not $chave -or -not $url) {
  Abortar "defina SOFTDESK_VM, SOFTDESK_SSH_KEY e SOFTDESK_URL (ver o cabecalho deste arquivo)"
}
if (-not (Test-Path $chave)) {
  Abortar "chave SSH nao encontrada em $chave"
}

# --- Portoes: tudo aqui roda antes de a VM ser tocada ---

Etapa 1 "Conferindo o repositorio"
$sujo = git status --porcelain
if ($sujo) {
  Write-Host ($sujo -join "`n") -ForegroundColor Yellow
  Abortar "ha alteracoes sem commit - o que vai pro ar precisa existir no GitHub"
}
git fetch --quiet origin
if ($LASTEXITCODE -ne 0) { Abortar "git fetch falhou" }
$commitLocal = (git rev-parse HEAD).Trim()
$commitRemoto = (git rev-parse origin/main).Trim()
if ($commitLocal -ne $commitRemoto) {
  Abortar "sua branch esta fora de sincronia com origin/main - faca push ou pull antes"
}
Write-Host "ok - arvore limpa em $($commitLocal.Substring(0,7)), igual a origin/main"

Etapa 2 "Rodando os testes"
npm test
if ($LASTEXITCODE -ne 0) { Abortar "os testes do backend falharam" }
npm run test:web
if ($LASTEXITCODE -ne 0) { Abortar "os testes do frontend falharam" }

Etapa 3 "Compilando o frontend"
# O Vite roda aqui e nao na VM: 1GB de RAM nao da conta do build.
npm run build:web
if ($LASTEXITCODE -ne 0) { Abortar "o build do frontend falhou" }
$indexLocal = Get-Content "public\index.html" -Raw
$bundleEsperado = [regex]::Match($indexLocal, 'assets/[A-Za-z0-9_.-]+\.js').Value
if (-not $bundleEsperado) { Abortar "nao achei o bundle no public/index.html gerado" }
Write-Host "ok - bundle $bundleEsperado"

# --- A partir daqui a VM e alterada ---

Etapa 4 "Enviando o build para a area de staging"
$script:vmTocada = $true
ssh -i $chave $vm "rm -rf /home/ubuntu/deploy-staging"
if ($LASTEXITCODE -ne 0) { Abortar "nao consegui limpar a area de staging na VM" }
scp -r -i $chave "public" "${vm}:/home/ubuntu/deploy-staging"
if ($LASTEXITCODE -ne 0) { Abortar "o envio do build falhou" }

Etapa 5 "Atualizando codigo e publicando na VM"
scp -i $chave "scripts\deploy-remoto.sh" "${vm}:/tmp/deploy-remoto.sh"
if ($LASTEXITCODE -ne 0) { Abortar "nao consegui enviar o script remoto" }
ssh -i $chave $vm "bash /tmp/deploy-remoto.sh $commitLocal"
if ($LASTEXITCODE -ne 0) { Abortar "o deploy na VM falhou" }

Etapa 6 "Conferindo pelo HTTPS publico"
# Conferir pelo nginx, e nao pelo disco da VM: e o nginx que diz a verdade
# sobre o que foi realmente publicado.
#
# Com espera, porque o dashboard sobe via ts-node e leva alguns segundos pra
# compilar numa VM de 1GB. Conferir logo depois do restart pega 502 do nginx com
# o backend ainda subindo, e o deploy seria dado como falho tendo dado certo.
$resposta = $null
$ultimoErro = "sem resposta"
$limite = (Get-Date).AddSeconds(90)
while ($true) {
  try {
    $resposta = Invoke-WebRequest -Uri "$url/" -UseBasicParsing -TimeoutSec 15
    if ($resposta.StatusCode -eq 200) { break }
    $ultimoErro = "HTTP $($resposta.StatusCode)"
  } catch {
    $ultimoErro = $_.Exception.Message
  }
  if ((Get-Date) -gt $limite) { Abortar "o site nao voltou em 90s - ultimo erro: $ultimoErro" }
  Write-Host "aguardando o dashboard subir..." -ForegroundColor DarkGray
  Start-Sleep -Seconds 5
}
if ($resposta.Content -notmatch [regex]::Escape($bundleEsperado)) {
  Abortar "o HTML servido nao referencia $bundleEsperado - o build antigo continua no ar"
}
Write-Host "ok - $url serve $bundleEsperado"

Etapa 7 "Concluido"
Write-Host "Publicado o commit $($commitLocal.Substring(0,7)) em $url" -ForegroundColor Green
Write-Host "Rollback do frontend, se precisar:" -ForegroundColor DarkGray
Write-Host "  ssh -i `"$chave`" $vm 'cd ~/softdesk-hcm-bot && rm -rf public && tar xzf ~/public-anterior.tar.gz'" -ForegroundColor DarkGray
