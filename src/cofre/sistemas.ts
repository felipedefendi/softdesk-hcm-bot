import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

/**
 * Cadastro dos sistemas dos clientes (G5, Cloud, eDocs...) usados pra
 * classificar as credenciais do cofre. Lista simples, sem hierarquia -
 * "Cloud - Antares" e "Cloud - Sirius" sao itens separados.
 */

export interface Sistema {
  id: string;
  nome: string;
  ativo: boolean;
}

const ARQUIVO = path.join(__dirname, "..", "..", "state", "cofre-sistemas.json");

const SEED: Sistema[] = [
  { id: crypto.randomUUID(), nome: "G5 (On-Premise)", ativo: true },
  { id: crypto.randomUUID(), nome: "G7", ativo: true },
  { id: crypto.randomUUID(), nome: "Cloud - Antares", ativo: true },
  { id: crypto.randomUUID(), nome: "Cloud - Sirius", ativo: true },
  { id: crypto.randomUUID(), nome: "eDocs", ativo: true },
  { id: crypto.randomUUID(), nome: "WildFly", ativo: true },
];

/** Le o cadastro; se o arquivo ainda nao existe, comeca do seed inicial (nao persiste sozinho). */
function ler(): Sistema[] {
  try {
    const raw = fs.readFileSync(ARQUIVO, "utf-8");
    return JSON.parse(raw) as Sistema[];
  } catch {
    return SEED;
  }
}

function escreverAtomico(lista: Sistema[]): void {
  fs.mkdirSync(path.dirname(ARQUIVO), { recursive: true });
  const tmp = `${ARQUIVO}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(lista, null, 2));
  fs.renameSync(tmp, ARQUIVO);
}

export function listarSistemas(): Sistema[] {
  return ler();
}

export function criarSistema(nome: string): Sistema {
  const nomeLimpo = nome.trim();
  if (!nomeLimpo) {
    throw new Error("Nome do sistema nao pode ser vazio");
  }

  const lista = ler();
  if (lista.some((s) => s.nome.toLowerCase() === nomeLimpo.toLowerCase())) {
    throw new Error(`Sistema "${nomeLimpo}" ja existe`);
  }

  const sistema: Sistema = { id: crypto.randomUUID(), nome: nomeLimpo, ativo: true };
  escreverAtomico([...lista, sistema]);
  return sistema;
}

/** Desativa em vez de remover - credenciais existentes continuam referenciando o id. */
export function desativarSistema(id: string): void {
  const lista = ler();
  if (!lista.some((s) => s.id === id)) {
    throw new Error("Sistema nao encontrado");
  }
  escreverAtomico(lista.map((s) => (s.id === id ? { ...s, ativo: false } : s)));
}

export function reativarSistema(id: string): void {
  const lista = ler();
  if (!lista.some((s) => s.id === id)) {
    throw new Error("Sistema nao encontrado");
  }
  escreverAtomico(lista.map((s) => (s.id === id ? { ...s, ativo: true } : s)));
}
