#!/bin/bash
# Metade do deploy que roda na VM. Chamado pelo deploy.ps1, que ja conferiu o
# repositorio, rodou os testes e mandou o build do frontend pra area de staging.
#
# Fica num arquivo proprio em vez de virar string dentro do PowerShell porque
# aspas, pipes e cifroes atravessando dois shells diferentes sao fonte garantida
# de bug silencioso - o PowerShell come as aspas e o que chega aqui nao e o que
# foi escrito la.
set -euo pipefail

COMMIT="${1:?uso: deploy-remoto.sh <commit>}"
APP=/home/ubuntu/softdesk-hcm-bot
STAGING=/home/ubuntu/deploy-staging

cd "$APP"

echo "--- guardando o que esta no ar (rollback) ---"
tar czf /home/ubuntu/public-anterior.tar.gz public
git rev-parse HEAD > /home/ubuntu/commit-anterior.txt
echo "commit anterior: $(git rev-parse --short HEAD)"

echo ""
echo "--- atualizando o codigo para ${COMMIT:0:7} ---"
git fetch --quiet origin
# reset --hard e nao pull: a VM e alvo de deploy, nao lugar de editar codigo.
# Assim o estado dela e sempre exatamente um commit, sem merge nem conflito
# possivel. state/ e .env sao ignorados pelo git, entao nao sao tocados.
lock_antes=$(md5sum package-lock.json | cut -d' ' -f1)
git reset --hard --quiet "$COMMIT"
lock_depois=$(md5sum package-lock.json | cut -d' ' -f1)

if [ "$lock_antes" != "$lock_depois" ]; then
  echo "--- package-lock.json mudou, reinstalando dependencias ---"
  npm ci
else
  echo "--- dependencias inalteradas, pulando npm ci ---"
fi

echo ""
echo "--- compilando o backend ---"
npm run build

echo ""
echo "--- publicando o frontend ---"
# Troca a pasta inteira em vez de sobrepor arquivo a arquivo. O scp so
# acrescenta, nunca remove, entao sobrepor ia deixando o bundle anterior pra
# tras a cada publicacao - em 28/07/2026 havia tres geracoes acumuladas.
rm -rf "$APP/public"
mv "$STAGING" "$APP/public"

echo ""
echo "--- reiniciando o dashboard ---"
# So o dashboard. O bot nao e processo continuo: cada disparo do systemd timer
# sobe um processo novo, que ja carrega o dist/ recem-compilado sozinho.
sudo systemctl restart softdesk-dashboard.service
sleep 2

echo ""
echo "--- conferindo as units do systemd ---"
# So compara, nao instala: reescrever /etc/systemd/system a cada publicacao seria
# poder demais pra um deploy de aplicacao. A conferencia existe porque a migracao
# de VM em 27/07/2026 deixou softdesk-relatorio.{service,timer} pra tras e ninguem
# percebeu por tres dias - relatorio que nao chega parece dia sem movimento.
units_fora=""
for versionada in "$APP"/deploy/systemd/*.service "$APP"/deploy/systemd/*.timer; do
  nome=$(basename "$versionada")
  instalada="/etc/systemd/system/$nome"
  if [ ! -f "$instalada" ]; then
    units_fora="$units_fora $nome(faltando)"
  elif ! diff -q "$versionada" "$instalada" > /dev/null 2>&1; then
    units_fora="$units_fora $nome(divergente)"
  fi
done
if [ -z "$units_fora" ]; then
  echo "todas conferem com deploy/systemd/"
else
  echo "ATENCAO - fora de sincronia:$units_fora"
fi

echo ""
echo "--- estado final na VM ---"
systemctl is-active softdesk-dashboard.service softdesk-bot.timer softdesk-relatorio.timer nginx
echo "commit publicado: $(git rev-parse --short HEAD)"
if [ -n "$units_fora" ]; then
  echo ""
  echo "ATENCAO - units do systemd fora de sincronia:$units_fora"
  echo "  sincronize com: sudo cp $APP/deploy/systemd/<nome> /etc/systemd/system/"
  echo "  e depois: sudo systemctl daemon-reload"
fi
