/**
 * Ponto de entrada usado em producao pelo systemd timer (softdesk-bot.timer)
 * na VM Oracle: executa uma unica passada do fluxo (lista -> SLA ->
 * atribuicao -> log -> Teams) e encerra. O agendamento e feito pelo proprio
 * timer (Seg-Sex, 07:00-18:00), nao por um loop dentro do processo. Tambem
 * pode ser rodado manualmente via `npm run rodar`.
 */
import { verificarChamados } from "./fluxo";

verificarChamados()
  .then((r) => {
    console.log(`[${new Date().toLocaleString("pt-BR")}] Verificacao concluida: ${r.processados} chamado(s) processado(s).`);
    process.exit(0);
  })
  .catch((err) => {
    console.error(`[${new Date().toLocaleString("pt-BR")}] Erro na verificacao:`, err);
    process.exit(1);
  });
