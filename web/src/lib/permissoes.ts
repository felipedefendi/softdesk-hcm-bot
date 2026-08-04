import type { Eu } from "../api/tipos";

/**
 * So pra esconder botao que a pessoa nao pode usar - UX, nao seguranca. A
 * autorizacao de verdade e sempre no servidor (ver src/usuarios/permissoes.ts
 * e src/dashboard/exigirPermissao.ts).
 *
 * O backend ja devolve papel "admin" pra sessao legada (senha compartilhada)
 * em /api/eu, entao nao ha necessidade de checar `tipo` aqui tambem.
 */
export function souAdmin(eu: Eu | null): boolean {
  return eu?.papel === "admin";
}

/** `codigoAtendente` e o do proprio usuario logado? */
export function ehMeuAtendente(eu: Eu | null, codigoAtendente: number | null): boolean {
  return eu !== null && eu.codigoAtendente !== null && eu.codigoAtendente === codigoAtendente;
}
