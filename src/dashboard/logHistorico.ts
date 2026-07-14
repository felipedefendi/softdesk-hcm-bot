import fs from "node:fs";
import path from "node:path";

const ARQUIVO = path.join(__dirname, "..", "..", "state", "encaminhamentos.log");

export interface EntradaLog {
  linhaOriginal: string;
  horario: string | null;
  chamado: number | null;
  clienteETitulo: string | null;
  atendente: string | null;
}

const PADRAO = /^(.+?) \| Chamado #(\d+) \((.+)\) -> (.+)$/;

/** Le o log de encaminhamentos e retorna as entradas mais recentes primeiro. */
export function lerHistorico(): EntradaLog[] {
  let conteudo = "";
  try {
    conteudo = fs.readFileSync(ARQUIVO, "utf-8");
  } catch {
    return [];
  }

  const linhas = conteudo.split("\n").filter((l) => l.trim().length > 0);

  return linhas
    .map((linha): EntradaLog => {
      const match = linha.match(PADRAO);
      if (!match) {
        return { linhaOriginal: linha, horario: null, chamado: null, clienteETitulo: null, atendente: null };
      }
      const [, horario, chamado, clienteETitulo, atendente] = match;
      return { linhaOriginal: linha, horario, chamado: Number(chamado), clienteETitulo, atendente };
    })
    .reverse();
}
