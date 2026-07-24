/**
 * Tipos das respostas da API, espelhando o que o servidor devolve de
 * verdade (ver src/dashboard/server.ts e os modulos que ele importa) -
 * cresce fase a fase, conforme as telas passam a consumir mais rotas.
 */

export interface StatusExecucao {
  ultimaExecucao: string | null;
  proximaExecucaoPrevista: string | null;
  ultimoErro: string | null;
  chamadosProcessadosUltimaExecucao: number;
}

export interface Automacao {
  ativa: boolean;
}

export interface ErroApi {
  erro: string;
}
