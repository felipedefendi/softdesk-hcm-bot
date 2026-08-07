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

/**
 * Quem esta logado, devolvido por GET /api/eu. So o que a UI precisa pra
 * decidir o que mostrar - a autorizacao de verdade e sempre no servidor, isto
 * e so pra esconder botao que a pessoa nao pode usar (UX, nao seguranca).
 */
export interface Eu {
  nome: string;
  papel: "admin" | "comum";
  codigoAtendente: number | null;
}

/** Espelha o paraPublico() de src/dashboard/usuariosRotas.ts - nunca inclui hash/salt. */
export interface UsuarioAdmin {
  id: string;
  nome: string;
  email: string;
  papel: "admin" | "comum";
  codigoAtendente: number | null;
  ativo: boolean;
  /** false = convite ainda pendente, a pessoa nunca definiu senha. */
  temSenha: boolean;
  bloqueadoAte: string | null;
  criadoEm: string;
}

export interface NovoUsuarioEntrada {
  nome: string;
  email: string;
  papel: "admin" | "comum";
  codigoAtendente: number | null;
}

export interface UsuarioCriado {
  usuario: UsuarioAdmin;
  /** O token cru, uma unica vez - depois disso so o hash fica em disco. */
  tokenConvite: string;
}

/** GET /api/convite/:token - so o que a pagina publica precisa pra saudar a pessoa certa. */
export interface ConviteInfo {
  nome: string;
  email: string;
}

/** Espelha LinhaAuditoria de src/auditoria.ts. */
export interface LinhaAuditoria {
  /** ISO. */
  quando: string;
  quem: string;
  acao: string;
  detalhe: string;
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

export interface Execucao {
  /** ISO. */
  inicio: string;
  duracaoMs: number;
  processados: number;
  erro: string | null;
}

export interface ItemFila {
  numero: number;
  titulo: string;
  cliente: string;
  link: string;
  /** ISO. */
  abertoEm: string;
  minutosDecorridosSla: number;
  /** Quem receberia este chamado em ordem de rodizio. null = ninguem disponivel. */
  atendentePrevisto: string | null;
}

export interface Fila {
  /** ISO - momento em que a lista foi de fato buscada no SoftDesk (o backend cacheia por 60s). */
  consultadoEm: string;
  limiteMinutos: number;
  proximoAtendente: string | null;
  chamados: ItemFila[];
}

/** Espelha src/agenda/tipos.ts. */
export type DiaEspecial =
  | { data: string; tipo: "bloqueado"; motivo: string }
  | {
      data: string;
      tipo: "janela";
      inicio: string;
      fim: string;
      motivo: string;
      /** Ausente ou vazio = todo o time participa desta escala. */
      escalados?: string[];
    };

export interface Ferias {
  id: string;
  atendente: string;
  /** YYYY-MM-DD, inclusivo nas duas pontas. */
  inicio: string;
  fim: string;
  observacao?: string;
}

export interface Agenda {
  diasEspeciais: DiaEspecial[];
  ferias: Ferias[];
}

/** Espelha o EstadoDoDia de src/agenda/regras.ts. */
export type EstadoDoDia =
  | { rodizio: "liberado" }
  | { rodizio: "bloqueado"; motivo: string }
  | { rodizio: "fora-da-janela"; inicio: string; fim: string; motivo: string };

export interface FeriadoSugerido {
  dia: DiaEspecial;
  marcadoPorPadrao: boolean;
}

/** O POST de ferias devolve os dias em que o rodizio ficaria sem ninguem. */
export interface FeriasSalvas {
  ferias: Ferias[];
  avisoSemNinguem: string[];
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
