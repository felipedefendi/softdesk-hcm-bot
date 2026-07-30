# Units do systemd

Copia fiel do que roda em `/etc/systemd/system/` na VM de producao.

Estao versionadas porque a migracao de VM em 27/07/2026 recriou apenas
`softdesk-bot.{service,timer}` e `softdesk-dashboard.service`. As units do
relatorio ficaram para tras e o relatorio diario parou de sair por tres dias
uteis sem ninguem notar - uma mensagem que nao chega ao Teams e indistinguivel
de um dia sem chamados.

O deploy **nao** instala estas units, so avisa quando o que esta na VM diverge
do que esta aqui (ver `scripts/deploy-remoto.sh`).

## Instalar numa VM nova

```bash
sudo cp deploy/systemd/* /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now softdesk-bot.timer softdesk-relatorio.timer
sudo systemctl enable --now softdesk-dashboard.service
```

`softdesk-bot.service` e `softdesk-relatorio.service` nao tem `[Install]` de
proposito: quem os ativa e o timer correspondente, nunca o boot.

## Conferir

```bash
systemctl list-timers --all softdesk-*
journalctl -u softdesk-relatorio.service -n 30 --no-pager
```

Para testar o relatorio sem postar nada no canal:

```bash
cd /home/ubuntu/softdesk-hcm-bot && node dist/rodar-relatorio.js --json
```
