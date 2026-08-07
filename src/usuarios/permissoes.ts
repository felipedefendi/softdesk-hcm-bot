import type { Usuario } from "./tipos";

/**
 * Autorizacao, funcoes puras. A UI pode esconder botao por conveniencia, mas
 * quem decide de verdade e o servidor - cada rota chama podeFazer antes de
 * agir, nunca confia em nada que veio do cliente alem do usuario autenticado.
 */

/** Quem esta pedindo - sempre uma pessoa autenticada pela Senior (ver dashboard/auth.ts). */
export type Principal = { tipo: "pessoa"; usuario: Usuario };

export type Acao =
  | "ver-paineis" // Visao geral, Fila ao vivo, Historico, Saude do bot
  | "rodizio:definir-proximo"
  | "rodizio:forcar-verificacao"
  | "rodizio:reordenar"
  | "atendente:desativar" // proprio (alvo = eu) ou de outro (so admin) - decidido pelo alvo
  | "agenda:ferias" // idem
  | "agenda:dia-especial"
  | "cofre:usar" // ver, destravar, revelar, criar, editar, arquivar - um bloco so
  | "senha:trocar-propria"
  | "automacao:pausar-retomar"
  | "configuracoes:alterar"
  | "usuarios:gerenciar"
  | "auditoria:ver";

/** Acoes que qualquer conta ativa pode fazer, sem checagem de alvo. */
const LIBERADO_A_TODOS = new Set<Acao>([
  "ver-paineis",
  "rodizio:definir-proximo",
  "rodizio:forcar-verificacao",
  "cofre:usar",
  "senha:trocar-propria",
]);

/**
 * Acoes onde "posso ou nao" depende de quem e o alvo: o proprio atendente
 * vinculado ao usuario libera, qualquer outro exige admin. Tudo que nao esta
 * nem aqui nem em LIBERADO_A_TODOS e admin-only por omissao - uma acao nova
 * so vale pra alguem comum depois de entrar explicitamente numa das duas
 * listas.
 */
const DEPENDE_DO_ALVO = new Set<Acao>(["atendente:desativar", "agenda:ferias"]);

export interface Alvo {
  codigoAtendente: number | null;
}

export function podeFazer(principal: Principal, acao: Acao, alvo?: Alvo): boolean {
  const usuario = principal.usuario;
  if (!usuario.ativo) return false;
  if (usuario.papel === "admin") return true;

  if (LIBERADO_A_TODOS.has(acao)) return true;

  if (DEPENDE_DO_ALVO.has(acao)) {
    if (usuario.codigoAtendente === null || !alvo) return false;
    return alvo.codigoAtendente === usuario.codigoAtendente;
  }

  return false;
}
