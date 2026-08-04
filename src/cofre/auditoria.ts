import fs from "node:fs";
import path from "node:path";

/**
 * Registro de acesso ao cofre: quem fez o que, quando. Append-only. Sem tela
 * de leitura (decisao da entrevista) - so grava.
 *
 * O "quem" so existe a partir da Fase 5 do PLANO-USUARIOS.md - linhas
 * gravadas antes disso tem 5 colunas, nao 6. Como nao ha leitor, isto nunca
 * quebrou nada; fica registrado aqui pra quando um leitor for escrito.
 */

export type AcaoAuditoria = "criar" | "editar" | "arquivar" | "restaurar" | "revelar";

const ARQUIVO = path.join(__dirname, "..", "..", "state", "cofre-auditoria.log");

/** Troca "|" pelo separador de colunas nunca aparecer dentro de um campo livre. */
function semPipe(valor: string): string {
  return valor.replace(/\|/g, "/");
}

/**
 * Nunca lanca: uma falha ao gravar auditoria (disco cheio, permissao) nao
 * pode derrubar a acao real do usuario no cofre.
 */
export function registrarAcao(quem: string, acao: AcaoAuditoria, credencialId: string, cliente: string, sistema: string): void {
  try {
    const linha = `${new Date().toISOString()} | ${semPipe(quem)} | ${acao} | ${credencialId} | ${semPipe(cliente)} | ${semPipe(sistema)}\n`;
    fs.mkdirSync(path.dirname(ARQUIVO), { recursive: true });
    fs.appendFileSync(ARQUIVO, linha);
  } catch (err) {
    console.error("Falha ao gravar auditoria do cofre:", err);
  }
}
