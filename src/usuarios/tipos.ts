/**
 * A conta como fica em disco (state/usuarios.json). E so a allowlist +
 * papel/atendente: a senha e a da conta Senior (ver dashboard/senior.ts), nao
 * fica nada de credencial local aqui.
 */

export type Papel = "admin" | "comum";

export interface Usuario {
  id: string;
  nome: string;
  /** Minusculo, unico - e o identificador de login (username no Senior X Platform). */
  email: string;
  papel: Papel;
  /**
   * Amarrado pelo codigo do atendente, nunca pelo nome - o nome muda (ver
   * atendentes.ts), o codigo nao. Nulavel: admin/gestor pode nao estar na fila.
   */
  codigoAtendente: number | null;
  ativo: boolean;
  /** ISO. */
  criadoEm: string;
}
