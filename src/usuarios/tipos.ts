/**
 * As formas que ficam em disco (state/usuarios.json e state/convites.json).
 * O frontend espelha em web/src/api/tipos.ts quando a Fase 4 chegar la.
 */

export type Papel = "admin" | "comum";

export interface Usuario {
  id: string;
  nome: string;
  /** Minusculo, unico - e o identificador de login. */
  email: string;
  /** scrypt em hex. */
  hashSenha: string;
  /** hex, unico por usuario. */
  salt: string;
  papel: Papel;
  /**
   * Amarrado pelo codigo do atendente, nunca pelo nome - o nome muda (ver
   * atendentes.ts), o codigo nao. Nulavel: admin/gestor pode nao estar na fila.
   */
  codigoAtendente: number | null;
  ativo: boolean;
  tentativasFalhas: number;
  /** ISO, ou null se a conta nao estiver bloqueada agora. */
  bloqueadoAte: string | null;
  /** ISO. */
  criadoEm: string;
}

/**
 * Um convite pendente. So o hash do token fica em disco - quem tiver o
 * arquivo (backup, vazamento) nao consegue usar um convite ja emitido, mesmo
 * dentro da janela de validade.
 */
export interface Convite {
  id: string;
  usuarioId: string;
  hashToken: string;
  /** ISO. */
  expiraEm: string;
  /** ISO, ou null enquanto nao usado. */
  usadoEm: string | null;
}
