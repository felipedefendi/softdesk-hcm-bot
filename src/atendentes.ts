import fs from "node:fs";
import path from "node:path";

export interface Atendente {
  nome: string;
  codigoAtendente: number;
  ativo: boolean;
  motivoInatividade: string | null;
  /** Data no formato YYYY-MM-DD. Quando definida e ja passou, reativa automaticamente. */
  retornaEm: string | null;
}

const ARQUIVO = path.join(__dirname, "..", "state", "atendentes.json");

export function listarAtendentes(): Atendente[] {
  const raw = fs.readFileSync(ARQUIVO, "utf-8");
  return JSON.parse(raw) as Atendente[];
}

function salvar(atendentes: Atendente[]): void {
  fs.mkdirSync(path.dirname(ARQUIVO), { recursive: true });
  fs.writeFileSync(ARQUIVO, JSON.stringify(atendentes, null, 2));
}

export function atendentesAtivos(): Atendente[] {
  return listarAtendentes().filter((a) => a.ativo);
}

/**
 * Reativa automaticamente quem tem "retornaEm" na data atual ou anterior.
 * Deve ser chamado antes de calcular o proximo da fila. Retorna true se
 * algum atendente foi reativado.
 */
export function reativarAutomaticamente(): boolean {
  const atendentes = listarAtendentes();
  const hoje = new Date().toISOString().slice(0, 10);
  let mudou = false;

  for (const a of atendentes) {
    if (!a.ativo && a.retornaEm && a.retornaEm <= hoje) {
      a.ativo = true;
      a.motivoInatividade = null;
      a.retornaEm = null;
      mudou = true;
    }
  }

  if (mudou) salvar(atendentes);
  return mudou;
}

export function marcarInativo(nome: string, motivo: string, retornaEm: string | null): void {
  const atendentes = listarAtendentes();
  const alvo = atendentes.find((a) => a.nome === nome);
  if (!alvo) throw new Error(`Atendente nao encontrado: ${nome}`);
  alvo.ativo = false;
  alvo.motivoInatividade = motivo;
  alvo.retornaEm = retornaEm;
  salvar(atendentes);
}

export function reativarManualmente(nome: string): void {
  const atendentes = listarAtendentes();
  const alvo = atendentes.find((a) => a.nome === nome);
  if (!alvo) throw new Error(`Atendente nao encontrado: ${nome}`);
  alvo.ativo = true;
  alvo.motivoInatividade = null;
  alvo.retornaEm = null;
  salvar(atendentes);
}

export function codigoDoAtendente(nome: string): number {
  const alvo = listarAtendentes().find((a) => a.nome === nome);
  if (!alvo) throw new Error(`Atendente nao encontrado: ${nome}`);
  return alvo.codigoAtendente;
}
