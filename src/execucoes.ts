import fs from "node:fs";
import path from "node:path";

/**
 * Historico de passadas do bot (verificarChamados em fluxo.ts), pra tela
 * "Saude do bot" do dashboard. Uma entrada por passada, nunca editada -
 * so acumula, com limite de tamanho.
 */

export interface Execucao {
  /** ISO. */
  inicio: string;
  duracaoMs: number;
  processados: number;
  erro: string | null;
}

const ARQUIVO = path.join(__dirname, "..", "state", "execucoes.json");
const LIMITE = 500;

function ler(): Execucao[] {
  try {
    const raw = fs.readFileSync(ARQUIVO, "utf-8");
    return JSON.parse(raw) as Execucao[];
  } catch {
    return [];
  }
}

function escreverAtomico(lista: Execucao[]): void {
  fs.mkdirSync(path.dirname(ARQUIVO), { recursive: true });
  const tmp = `${ARQUIVO}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(lista, null, 2));
  fs.renameSync(tmp, ARQUIVO);
}

export function registrarExecucao(execucao: Execucao): void {
  const lista = ler();
  lista.push(execucao);
  escreverAtomico(lista.slice(-LIMITE));
}

export function listarExecucoes(): Execucao[] {
  return ler();
}
