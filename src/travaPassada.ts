import fs from "node:fs";
import path from "node:path";

/**
 * Uma passada do rodizio por vez, entre processos. O timer (rodar-uma-vez.js) e
 * o botao "Forcar verificacao agora" (dashboard) rodam em processos diferentes:
 * sem isto, os dois podiam listar os mesmos chamados ao mesmo tempo, atribuir em
 * dobro e mandar dois cards misturados pro Teams.
 *
 * A trava e um arquivo criado com "wx" (falha se ja existir) - atomico no
 * sistema de arquivos, sem dependencia nova.
 */
export class PassadaEmAndamento extends Error {
  constructor() {
    super("Ja existe uma verificacao em andamento");
    this.name = "PassadaEmAndamento";
  }
}

/** Uma passada leva segundos; trava mais velha que isso ficou de um processo que morreu no meio. */
const VALIDADE_MS = 10 * 60 * 1000;

function criar(arquivo: string): boolean {
  try {
    fs.writeFileSync(arquivo, String(process.pid), { flag: "wx" });
    return true;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "EEXIST") return false;
    throw err;
  }
}

/** Devolve a funcao que libera a trava, ou null se outra passada esta rodando. */
export function tentarTravar(arquivo: string, agora = Date.now()): (() => void) | null {
  fs.mkdirSync(path.dirname(arquivo), { recursive: true });

  if (!criar(arquivo)) {
    const idade = agora - (fs.statSync(arquivo, { throwIfNoEntry: false })?.mtimeMs ?? 0);
    if (idade < VALIDADE_MS) return null;
    fs.rmSync(arquivo, { force: true });
    if (!criar(arquivo)) return null;
  }

  return () => fs.rmSync(arquivo, { force: true });
}
