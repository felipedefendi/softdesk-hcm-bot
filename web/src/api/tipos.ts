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

export interface Configuracoes {
  pollIntervalMinutes: number;
  encaminhamentoLimiteMinutos: number;
  automacaoAtiva: boolean;
  diasSemReceberParaAlerta: number;
}

export interface Sistema {
  id: string;
  nome: string;
  ativo: boolean;
}

export interface CredencialMetadados {
  id: string;
  cliente: string;
  sistemaId: string;
  link: string | null;
  /** Data no formato YYYY-MM-DD, ou null = sem validade cadastrada. */
  validade: string | null;
  arquivado: boolean;
  criadoEm: string;
  atualizadoEm: string;
}

export interface CredencialRevelada {
  login: string;
  senha: string;
  observacoes: string | null;
}

export interface ItemFila {
  numero: number;
  titulo: string;
  cliente: string;
  link: string;
  /** ISO. */
  abertoEm: string;
  minutosDecorridosSla: number;
}

export interface Fila {
  /** ISO - momento em que a lista foi de fato buscada no SoftDesk (o backend cacheia por 60s). */
  consultadoEm: string;
  limiteMinutos: number;
  proximoAtendente: string | null;
  chamados: ItemFila[];
}

export interface CredencialEntrada {
  cliente: string;
  sistemaId: string;
  link?: string | null;
  validade?: string | null;
  /** Na edicao, em branco mantem o valor atual (ver editarCredencial no backend). */
  login: string;
  senha: string;
  observacoes?: string | null;
}
