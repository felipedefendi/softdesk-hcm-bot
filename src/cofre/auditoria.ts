import fs from "node:fs";
import path from "node:path";

/**
 * Registro de acesso ao cofre: quem fez o que, quando. Append-only, sem
 * "quem" pessoal enquanto a senha do painel for compartilhada - passa a ter
 * nome real quando o login por pessoa entrar (ver PLANO-USUARIOS.md). Sem
 * tela de leitura por enquanto (decisao da entrevista) - so grava.
 */

export type AcaoAuditoria = "criar" | "editar" | "arquivar" | "restaurar" | "revelar";

const ARQUIVO = path.join(__dirname, "..", "..", "state", "cofre-auditoria.log");

/** Troca "|" pelo formato de log ficar sempre em 5 colunas, mesmo com nome de cliente/sistema livre. */
function semPipe(valor: string): string {
  return valor.replace(/\|/g, "/");
}

/**
 * Nunca lanca: uma falha ao gravar auditoria (disco cheio, permissao) nao
 * pode derrubar a acao real do usuario no cofre.
 */
export function registrarAcao(acao: AcaoAuditoria, credencialId: string, cliente: string, sistema: string): void {
  try {
    const linha = `${new Date().toISOString()} | ${acao} | ${credencialId} | ${semPipe(cliente)} | ${semPipe(sistema)}\n`;
    fs.mkdirSync(path.dirname(ARQUIVO), { recursive: true });
    fs.appendFileSync(ARQUIVO, linha);
  } catch (err) {
    console.error("Falha ao gravar auditoria do cofre:", err);
  }
}
