import type { Usuario } from "./tipos";

/**
 * Autorizacao, funcoes puras. A UI pode esconder botao por conveniencia, mas
 * quem decide de verdade e o servidor - cada rota chama podeFazer antes de
 * agir, nunca confia em nada que veio do cliente alem do usuario autenticado.
 */

export type Acao =
  | "ver-paineis" // Visao geral, Fila ao vivo, Historico, Saude do bot
  | "rodizio:definir-proximo"
  | "rodizio:forcar-verificacao"
  | "rodizio:reordenar"
  | "atendente:desativar-proprio"
  | "atendente:desativar-outros"
  | "agenda:ferias-propria"
  | "agenda:ferias-outros"
  | "agenda:dia-especial"
  | "cofre:usar" // ver, destravar, revelar, criar, editar, arquivar - um bloco so
  | "senha:trocar-propria"
  | "automacao:pausar-retomar"
  | "configuracoes:alterar"
  | "usuarios:gerenciar"
  | "auditoria:ver";

/** Acoes que qualquer conta ativa pode fazer, sem checagem de "proprio". */
const LIBERADO_A_TODOS = new Set<Acao>([
  "ver-paineis",
  "rodizio:definir-proximo",
  "rodizio:forcar-verificacao",
  "cofre:usar",
  "senha:trocar-propria",
]);

/** Acoes restritas a admin, sem excecao. */
const SO_ADMIN = new Set<Acao>([
  "atendente:desativar-outros",
  "agenda:ferias-outros",
  "agenda:dia-especial",
  "rodizio:reordenar",
  "automacao:pausar-retomar",
  "configuracoes:alterar",
  "usuarios:gerenciar",
  "auditoria:ver",
]);

/**
 * Acoes "proprio X" - liberadas quando o alvo e o proprio atendente vinculado
 * ao usuario. Sem vinculo (codigoAtendente null), a acao nao tem "proprio"
 * pra fazer e cai fora, mesmo se o usuario for comum.
 */
const PROPRIO: Partial<Record<Acao, true>> = {
  "atendente:desativar-proprio": true,
  "agenda:ferias-propria": true,
};

export interface Alvo {
  codigoAtendente: number | null;
}

/**
 * `alvo` so importa para as acoes "proprio X" - nas demais e ignorado. Conta
 * inativa nunca pode nada, admin ou nao: desativar e a forma de tirar acesso.
 */
export function podeFazer(usuario: Usuario, acao: Acao, alvo?: Alvo): boolean {
  if (!usuario.ativo) return false;
  if (usuario.papel === "admin") return true;

  if (LIBERADO_A_TODOS.has(acao)) return true;
  if (SO_ADMIN.has(acao)) return false;

  if (PROPRIO[acao]) {
    if (usuario.codigoAtendente === null || !alvo) return false;
    return alvo.codigoAtendente === usuario.codigoAtendente;
  }

  // Acao nao mapeada: nega por padrao, nao libera. Uma acao nova precisa
  // entrar explicitamente numa das listas acima antes de valer para alguem.
  return false;
}
