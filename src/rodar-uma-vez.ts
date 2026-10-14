/**
 * Ponto de entrada usado em producao pelo systemd timer (softdesk-bot.timer)
 * na VM Oracle: executa uma unica passada do fluxo (lista -> SLA ->
 * atribuicao -> log -> Teams) e encerra. O agendamento e feito pelo proprio
 * timer (Seg-Sex, 07:00-18:00), nao por um loop dentro do processo. Tambem
 * pode ser rodado manualmente via `npm run rodar`.
 */
import { verificarChamados } from "./fluxo";
import { PassadaEmAndamento } from "./travaPassada";

verificarChamados()
  .then((r) => {
    console.log(`[${new Date().toLocaleString("pt-BR")}] Verificacao concluida: ${r.processados} chamado(s) processado(s).`);
    process.exit(0);
  })
  .catch((err) => {
    if (err instanceof PassadaEmAndamento) {
      // Alguem apertou "Forcar verificacao agora" no painel bem nesta hora - essa
      // passada ja cuida dos chamados, nao e falha.
      console.log(`[${new Date().toLocaleString("pt-BR")}] Passada pulada: outra verificacao em andamento.`);
      process.exit(0);
    }
    console.error(`[${new Date().toLocaleString("pt-BR")}] Erro na verificacao:`, err);
    process.exit(1);
  });
