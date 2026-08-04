/**
 * Leitura e escrita dos dois cadastros da Agenda. So I/O: quem decide alguma
 * coisa e o regras.ts, quem valida tambem - as rotas chamam a validacao antes
 * de gravar pra poder devolver o motivo em 400.
 */
import fs from "node:fs";
import path from "node:path";
import type { DiaEspecial, Ferias } from "./tipos";

const DIAS_ESPECIAIS = path.join(__dirname, "..", "..", "state", "dias-especiais.json");
const FERIAS = path.join(__dirname, "..", "..", "state", "ferias.json");

function ler<T>(arquivo: string): T[] {
  try {
    return JSON.parse(fs.readFileSync(arquivo, "utf-8")) as T[];
  } catch {
    // Arquivo ainda nao existe: agenda vazia e o estado inicial legitimo. Nao
    // grava seed nenhum - dia sem cadastro e dia normal.
    return [];
  }
}

function gravar<T>(arquivo: string, itens: T[]): void {
  fs.mkdirSync(path.dirname(arquivo), { recursive: true });
  fs.writeFileSync(arquivo, JSON.stringify(itens, null, 2));
}

export function lerDiasEspeciais(): DiaEspecial[] {
  return ler<DiaEspecial>(DIAS_ESPECIAIS);
}

export function lerFerias(): Ferias[] {
  return ler<Ferias>(FERIAS);
}

/**
 * Grava um ou varios dias, substituindo o que ja houver na mesma data.
 *
 * Substituir em vez de recusar deixa o botao de feriados ser reexecutado sem
 * dar erro. E evita duplicata, que aqui seria pior do que barulhenta: o
 * `estadoDoDia` usa o primeiro que encontra, entao a segunda entrada da mesma
 * data ficaria no arquivo sem nunca valer.
 */
export function salvarDiasEspeciais(novos: DiaEspecial[]): DiaEspecial[] {
  const porData = new Map(lerDiasEspeciais().map((d) => [d.data, d]));
  for (const novo of novos) porData.set(novo.data, novo);

  const lista = [...porData.values()].sort((a, b) => a.data.localeCompare(b.data));
  gravar(DIAS_ESPECIAIS, lista);
  return lista;
}

export function removerDiaEspecial(data: string): DiaEspecial[] {
  const lista = lerDiasEspeciais().filter((d) => d.data !== data);
  gravar(DIAS_ESPECIAIS, lista);
  return lista;
}

/** Cria ou atualiza (pelo id) e devolve a lista ja ordenada por data de inicio. */
export function salvarFerias(nova: Ferias): Ferias[] {
  const porId = new Map(lerFerias().map((f) => [f.id, f]));
  porId.set(nova.id, nova);

  const lista = [...porId.values()].sort((a, b) => a.inicio.localeCompare(b.inicio));
  gravar(FERIAS, lista);
  return lista;
}

export function removerFerias(id: string): Ferias[] {
  const lista = lerFerias().filter((f) => f.id !== id);
  gravar(FERIAS, lista);
  return lista;
}
