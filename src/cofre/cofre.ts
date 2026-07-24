import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { cifrar, decifrar, type CampoCifrado } from "./cripto";
import { listarSistemas } from "./sistemas";
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

function linkValido(link: string): boolean {
  try {
    const url = new URL(link);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/** Campos que valem tanto pra criar quanto pra editar - falha rapido com mensagem clara. */
function validarCamposComuns(entrada: CredencialEntrada): void {
  if (!entrada.cliente?.trim()) throw new Error("Cliente e obrigatorio");
  if (entrada.link?.trim() && !linkValido(entrada.link.trim())) {
    throw new Error("Link precisa comecar com http:// ou https://");
  }
  if (!listarSistemas().some((s) => s.id === entrada.sistemaId)) {
    throw new Error("Sistema nao encontrado");
  }
}

/** Todas as credenciais nao arquivadas, sem login/senha/observacoes. */
export function listarMetadados(): CredencialMetadados[] {
  return ler()
    .filter((c) => !c.arquivado)
    .map(paraMetadados);
}

export function criarCredencial(entrada: CredencialEntrada): CredencialMetadados {
  validarCamposComuns(entrada);
  if (!entrada.login?.trim()) throw new Error("Login e obrigatorio");
  if (!entrada.senha) throw new Error("Senha e obrigatoria");
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

/**
 * Edita uma credencial. login/senha/observacoes sao opcionais aqui de
 * proposito: em branco, mantem os valores atuais - editar o link ou o
 * cliente nao deveria exigir destravar/revelar so pra reenviar os campos
 * cifrados de volta (a tela de edicao rapida nao os pre-preenche).
 */
export function editarCredencial(id: string, entrada: CredencialEntrada): CredencialMetadados {
  validarCamposComuns(entrada);
  const chave = chaveOuFalha();
  const lista = ler();
  const indice = lista.findIndex((c) => c.id === id);
  if (indice === -1) {
    throw new Error("Credencial nao encontrada");
  }
  const atual = lista[indice];

  const atualizada: CredencialArmazenada = {
    ...atual,
    cliente: entrada.cliente.trim(),
    sistemaId: entrada.sistemaId,
    link: entrada.link?.trim() || null,
    validade: entrada.validade || null,
    login: entrada.login?.trim() ? cifrar(entrada.login, chave) : atual.login,
    senha: entrada.senha ? cifrar(entrada.senha, chave) : atual.senha,
    observacoes: entrada.observacoes ? cifrar(entrada.observacoes, chave) : atual.observacoes,
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
