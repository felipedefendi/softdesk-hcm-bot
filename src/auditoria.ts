import fs from "node:fs";
import path from "node:path";
import type { Request } from "express";

/**
 * Registro append-only de acoes administrativas no painel - quem fez o que,
 * quando. Separado do cofre/auditoria.ts (que so grava, por decisao da
 * entrevista): este tem tela de leitura, restrita a admin (ver
 * PLANO-USUARIOS.md, Fase 5).
 */

const ARQUIVO = path.join(__dirname, "..", "state", "auditoria.log");

/** Troca "|" pelo separador de colunas nunca aparecer dentro de um campo livre. */
function semPipe(valor: string): string {
  return valor.replace(/\|/g, "/");
}

/** Quem esta pedindo, pro rotulo do log - o nome do usuario logado. */
export function quemEstaAgindo(req: Request): string {
  const sessao = req.sessao;
  if (!sessao) return "desconhecido";
  return sessao.usuario.nome;
}

/**
 * Nunca lanca: uma falha ao gravar auditoria (disco cheio, permissao) nao
 * pode derrubar a acao real que a pessoa estava fazendo.
 */
export function registrarAcao(quem: string, acao: string, detalhe: string): void {
  try {
    // Nunca grava o campo vazio: "...| " com nada depois faz o split do
    // leitor colar o "|" sobrando de volta no campo anterior (acao).
    const linha = `${new Date().toISOString()} | ${semPipe(quem)} | ${semPipe(acao)} | ${semPipe(detalhe) || "-"}\n`;
    fs.mkdirSync(path.dirname(ARQUIVO), { recursive: true });
    fs.appendFileSync(ARQUIVO, linha);
  } catch (err) {
    console.error("Falha ao gravar auditoria do painel:", err);
  }
}

export interface LinhaAuditoria {
  quando: string;
  quem: string;
  acao: string;
  detalhe: string;
}

/** Mais recente primeiro - e o que quem esta lendo quer ver primeiro. */
export function lerAuditoria(limite = 500): LinhaAuditoria[] {
  try {
    const linhas = fs
      .readFileSync(ARQUIVO, "utf-8")
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    return linhas
      .map((linha): LinhaAuditoria | null => {
        const [quando, quem, acao, ...resto] = linha.split(" | ");
        if (!quando || !quem || !acao) return null;
        return { quando, quem, acao, detalhe: resto.join(" | ") };
      })
      .filter((l): l is LinhaAuditoria => l !== null)
      .reverse()
      .slice(0, limite);
  } catch {
    return [];
  }
}
