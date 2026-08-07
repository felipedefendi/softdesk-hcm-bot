import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import type { Usuario, Papel } from "./tipos";

const ARQUIVO = path.join(__dirname, "..", "..", "state", "usuarios.json");

export function listarUsuarios(): Usuario[] {
  try {
    return JSON.parse(fs.readFileSync(ARQUIVO, "utf-8")) as Usuario[];
  } catch {
    return [];
  }
}

function salvar(usuarios: Usuario[]): void {
  fs.mkdirSync(path.dirname(ARQUIVO), { recursive: true });
  fs.writeFileSync(ARQUIVO, JSON.stringify(usuarios, null, 2));
}

export function normalizarEmail(email: string): string {
  return email.trim().toLowerCase();
}

const FORMATO_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function emailValido(email: string): boolean {
  return FORMATO_EMAIL.test(normalizarEmail(email));
}

export function buscarPorEmail(email: string): Usuario | undefined {
  const alvo = normalizarEmail(email);
  return listarUsuarios().find((u) => u.email === alvo);
}

export function buscarPorId(id: string): Usuario | undefined {
  return listarUsuarios().find((u) => u.id === id);
}

function atualizar(usuarioId: string, aplicar: (u: Usuario) => Usuario): Usuario {
  const usuarios = listarUsuarios();
  const indice = usuarios.findIndex((u) => u.id === usuarioId);
  if (indice === -1) throw new Error(`Usuario nao encontrado: ${usuarioId}`);

  usuarios[indice] = aplicar(usuarios[indice]);
  salvar(usuarios);
  return usuarios[indice];
}

// --- CRUD ---

export interface NovoUsuario {
  nome: string;
  email: string;
  papel: Papel;
  codigoAtendente: number | null;
}

/**
 * Registra a conta na allowlist. A pessoa ja entra pela Senior com a propria
 * senha - nao ha senha local pra definir depois.
 */
export function criarUsuario(novo: NovoUsuario): Usuario {
  const email = normalizarEmail(novo.email);
  if (!emailValido(email)) throw new Error(`E-mail invalido: "${novo.email}"`);
  if (buscarPorEmail(email)) throw new Error(`Ja existe uma conta com o e-mail "${email}".`);

  const usuario: Usuario = {
    id: crypto.randomUUID(),
    nome: novo.nome.trim(),
    email,
    papel: novo.papel,
    codigoAtendente: novo.codigoAtendente,
    ativo: true,
    criadoEm: new Date().toISOString(),
  };

  const usuarios = listarUsuarios();
  usuarios.push(usuario);
  salvar(usuarios);
  return usuario;
}

export function mudarPapel(usuarioId: string, papel: Papel): Usuario {
  return atualizar(usuarioId, (u) => ({ ...u, papel }));
}

/**
 * Corrige o e-mail de login (que e tambem o username no Senior X Platform, ver
 * dashboard/senior.ts). Normaliza e recusa colisao com outra conta - a mesma
 * checagem de criarUsuario, so que ignorando a propria conta.
 */
export function mudarEmail(usuarioId: string, novoEmail: string): Usuario {
  const email = normalizarEmail(novoEmail);
  if (!emailValido(email)) throw new Error(`E-mail invalido: "${novoEmail}"`);
  const existente = buscarPorEmail(email);
  if (existente && existente.id !== usuarioId) throw new Error(`Ja existe uma conta com o e-mail "${email}".`);
  return atualizar(usuarioId, (u) => ({ ...u, email }));
}

/** Bloqueia o login, preserva o historico, tira a conta de qualquer coisa que dependa de "ativo". */
export function desativarUsuario(usuarioId: string): Usuario {
  return atualizar(usuarioId, (u) => ({ ...u, ativo: false }));
}

export function reativarUsuario(usuarioId: string): Usuario {
  return atualizar(usuarioId, (u) => ({ ...u, ativo: true }));
}

/**
 * Quantos admins ativos existem. Pura - usada pra impedir que a ultima conta
 * capaz de gerenciar usuarios seja desativada ou rebaixada por engano, o que
 * trancaria a gestao de usuarios sem ninguem pra destrancar (o maior risco
 * listado no PLANO-USUARIOS.md).
 */
export function contarAdminsAtivos(usuarios: Usuario[]): number {
  return usuarios.filter((u) => u.papel === "admin" && u.ativo).length;
}
