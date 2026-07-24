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

export interface Atendente {
  nome: string;
  codigoAtendente: number;
  ativo: boolean;
  motivoInatividade: string | null;
  /** Data no formato YYYY-MM-DD. */
  retornaEm: string | null;
  emailTeams?: string | null;
}

export interface Rotation {
  proximo: string;
}

export interface EntradaLog {
  linhaOriginal: string;
  horario: string | null;
  chamado: number | null;
  clienteETitulo: string | null;
  atendente: string | null;
}

export interface AtendenteSemReceber {
  atendente: string;
  /** Dias uteis desde o ultimo chamado. null = nao aparece no historico. */
  diasUteis: number | null;
}

export interface AlertaRodizio {
  limite: number;
  atendentes: AtendenteSemReceber[];
}

export interface VerificarAgoraResultado {
  processados: number;
}
