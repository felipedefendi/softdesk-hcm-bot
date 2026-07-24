import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { cifrar, decifrar, type CampoCifrado } from "./cripto";
import { config } from "../config";

/**
 * CRUD das credenciais do cofre. Cliente, sistema, link e validade ficam
 * legiveis no JSON (permitem busca); login, senha e observacoes ficam
 * cifrados (ver cripto.ts). listarMetadados nunca inclui os campos
 * cifrados - so revelarCredencial decifra, e so deve ser chamada apos o
 * destrave (a checagem de destrave fica nas rotas, fase 2).
 */

interface CredencialArmazenada {
  id: string;
  cliente: string;
  sistemaId: string;
  link: string | null;
  validade: string | null; // "YYYY-MM-DD" ou null
  login: CampoCifrado;
  senha: CampoCifrado;
  observacoes: CampoCifrado | null;
  arquivado: boolean;
  criadoEm: string;
  atualizadoEm: string;
}

export interface CredencialEntrada {
  cliente: string;
  sistemaId: string;
  link?: string | null;
  validade?: string | null;
  login: string;
  senha: string;
  observacoes?: string | null;
}

export interface CredencialMetadados {
  id: string;
  cliente: string;
  sistemaId: string;
  link: string | null;
  validade: string | null;
  arquivado: boolean;
  criadoEm: string;
  atualizadoEm: string;
}

export interface CredencialRevelada {
  login: string;
  senha: string;
  observacoes: string | null;
}

const ARQUIVO = path.join(__dirname, "..", "..", "state", "cofre.json");

function chaveOuFalha(): string {
  if (!config.cofreChave) {
    throw new Error("Defina COFRE_CHAVE no arquivo .env (gere com: npm run cofre:gerar-chave)");
  }
  return config.cofreChave;
}

function ler(): CredencialArmazenada[] {
  try {
    const raw = fs.readFileSync(ARQUIVO, "utf-8");
    return JSON.parse(raw) as CredencialArmazenada[];
  } catch {
    return [];
  }
}

function escreverAtomico(lista: CredencialArmazenada[]): void {
  fs.mkdirSync(path.dirname(ARQUIVO), { recursive: true });
  const tmp = `${ARQUIVO}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(lista, null, 2));
  fs.renameSync(tmp, ARQUIVO);
}

function paraMetadados(c: CredencialArmazenada): CredencialMetadados {
  const { login, senha, observacoes, ...metadados } = c;
  return metadados;
}

/** Todas as credenciais nao arquivadas, sem login/senha/observacoes. */
export function listarMetadados(): CredencialMetadados[] {
  return ler()
    .filter((c) => !c.arquivado)
    .map(paraMetadados);
}

export function criarCredencial(entrada: CredencialEntrada): CredencialMetadados {
  const chave = chaveOuFalha();
  const lista = ler();
  const agora = new Date().toISOString();

  const credencial: CredencialArmazenada = {
    id: crypto.randomUUID(),
    cliente: entrada.cliente.trim(),
    sistemaId: entrada.sistemaId,
    link: entrada.link?.trim() || null,
    validade: entrada.validade || null,
    login: cifrar(entrada.login, chave),
    senha: cifrar(entrada.senha, chave),
    observacoes: entrada.observacoes ? cifrar(entrada.observacoes, chave) : null,
    arquivado: false,
    criadoEm: agora,
    atualizadoEm: agora,
  };

  escreverAtomico([...lista, credencial]);
  return paraMetadados(credencial);
}

export function editarCredencial(id: string, entrada: CredencialEntrada): CredencialMetadados {
  const chave = chaveOuFalha();
  const lista = ler();
  const indice = lista.findIndex((c) => c.id === id);
  if (indice === -1) {
    throw new Error("Credencial nao encontrada");
  }

  const atualizada: CredencialArmazenada = {
    ...lista[indice],
    cliente: entrada.cliente.trim(),
    sistemaId: entrada.sistemaId,
    link: entrada.link?.trim() || null,
    validade: entrada.validade || null,
    login: cifrar(entrada.login, chave),
    senha: cifrar(entrada.senha, chave),
    observacoes: entrada.observacoes ? cifrar(entrada.observacoes, chave) : null,
    atualizadoEm: new Date().toISOString(),
  };

  lista[indice] = atualizada;
  escreverAtomico(lista);
  return paraMetadados(atualizada);
}

/** Decifra login/senha/observacoes de uma credencial. So chamar apos o destrave (fase 2). */
export function revelarCredencial(id: string): CredencialRevelada {
  const chave = chaveOuFalha();
  const credencial = ler().find((c) => c.id === id && !c.arquivado);
  if (!credencial) {
    throw new Error("Credencial nao encontrada");
  }

  return {
    login: decifrar(credencial.login, chave),
    senha: decifrar(credencial.senha, chave),
    observacoes: credencial.observacoes ? decifrar(credencial.observacoes, chave) : null,
  };
}

/** Arquiva (soft-delete): sai da listagem mas fica recuperavel. */
export function arquivarCredencial(id: string): void {
  const lista = ler();
  const indice = lista.findIndex((c) => c.id === id);
  if (indice === -1) {
    throw new Error("Credencial nao encontrada");
  }
  lista[indice] = { ...lista[indice], arquivado: true, atualizadoEm: new Date().toISOString() };
  escreverAtomico(lista);
}

export function restaurarCredencial(id: string): void {
  const lista = ler();
  const indice = lista.findIndex((c) => c.id === id);
  if (indice === -1) {
    throw new Error("Credencial nao encontrada");
  }
  lista[indice] = { ...lista[indice], arquivado: false, atualizadoEm: new Date().toISOString() };
  escreverAtomico(lista);
}
