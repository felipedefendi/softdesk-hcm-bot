/**
 * Ponto de entrada para o Windows Task Scheduler: executa uma unica passada
 * do fluxo (lista -> SLA -> atribuicao -> log -> Teams) e encerra. O
 * agendamento de "a cada 5 minutos" e feito pelo proprio Task Scheduler, nao
 * por um loop dentro do processo.
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
