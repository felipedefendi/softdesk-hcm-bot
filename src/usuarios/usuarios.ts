import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import type { Usuario, Papel } from "./tipos";

const ARQUIVO = path.join(__dirname, "..", "..", "state", "usuarios.json");

const TAMANHO_SALT = 16;
const TAMANHO_HASH = 64;

const LIMITE_TENTATIVAS = 5;
const DURACAO_BLOQUEIO_MS = 15 * 60 * 1000;

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

// --- hash e verificacao de senha (scrypt nativo do Node) ---

function gerarSalt(): string {
  return crypto.randomBytes(TAMANHO_SALT).toString("hex");
}

function derivarHash(senha: string, saltHex: string): string {
  return crypto.scryptSync(senha, Buffer.from(saltHex, "hex"), TAMANHO_HASH).toString("hex");
}

/**
 * Compara em tempo constante via buffers de mesmo tamanho - evita vazar,
 * pela duracao da resposta, quanto da senha tentada bate com a real.
 */
export function verificarSenha(usuario: Usuario, tentativa: string): boolean {
  if (!usuario.hashSenha) return false; // conta ainda sem senha definida (convite pendente)
  const calculado = derivarHash(tentativa, usuario.salt);
  const a = Buffer.from(calculado, "hex");
  const b = Buffer.from(usuario.hashSenha, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** Usado tanto na conclusao do convite quanto num reset feito pelo admin. */
export function definirSenha(usuarioId: string, novaSenha: string): Usuario {
  const usuarios = listarUsuarios();
  const alvo = usuarios.find((u) => u.id === usuarioId);
  if (!alvo) throw new Error(`Usuario nao encontrado: ${usuarioId}`);

  const salt = gerarSalt();
  alvo.salt = salt;
  alvo.hashSenha = derivarHash(novaSenha, salt);
  alvo.tentativasFalhas = 0;
  alvo.bloqueadoAte = null;

  salvar(usuarios);
  return alvo;
}

// --- bloqueio temporario por tentativas falhas ---
// Isoladas como funcoes puras (recebem/devolvem Usuario, sem tocar em disco)
// para poderem ser testadas sem depender do arquivo.

/** Verdadeiro se o bloqueio ainda esta em vigor no momento informado. */
export function contaBloqueada(usuario: Usuario, agora: Date): boolean {
  return usuario.bloqueadoAte !== null && new Date(usuario.bloqueadoAte) > agora;
}

/**
 * Ao chegar no limite de tentativas, bloqueia por DURACAO_BLOQUEIO_MS a
 * partir de agora - o bloqueio destrava sozinho, sem acao de admin.
 *
 * Se ja existia um bloqueio e ele ja passou, a tentativa atual comeca uma
 * janela nova do zero. Sem isso "destrava sozinho" seria mentira: bastaria
 * errar mais uma vez depois da janela pra travar de novo na hora, pra sempre
 * - quem for tentando de tempos em tempos nunca teria as 5 chances de volta.
 */
export function aplicarTentativaFalha(usuario: Usuario, agora: Date): Usuario {
  const comecandoJanelaNova = usuario.bloqueadoAte !== null && !contaBloqueada(usuario, agora);
  const tentativas = (comecandoJanelaNova ? 0 : usuario.tentativasFalhas) + 1;
  const bloqueadoAte =
    tentativas >= LIMITE_TENTATIVAS
      ? new Date(agora.getTime() + DURACAO_BLOQUEIO_MS).toISOString()
      : comecandoJanelaNova
        ? null
        : usuario.bloqueadoAte;

  return { ...usuario, tentativasFalhas: tentativas, bloqueadoAte };
}

export function aplicarSucesso(usuario: Usuario): Usuario {
  return { ...usuario, tentativasFalhas: 0, bloqueadoAte: null };
}

function atualizar(usuarioId: string, aplicar: (u: Usuario) => Usuario): Usuario {
  const usuarios = listarUsuarios();
  const indice = usuarios.findIndex((u) => u.id === usuarioId);
  if (indice === -1) throw new Error(`Usuario nao encontrado: ${usuarioId}`);

  usuarios[indice] = aplicar(usuarios[indice]);
  salvar(usuarios);
  return usuarios[indice];
}

/** Persiste o resultado de uma tentativa de login (sucesso ou falha) de uma vez. */
export function registrarTentativa(usuarioId: string, sucesso: boolean, agora: Date = new Date()): Usuario {
  return atualizar(usuarioId, (u) => (sucesso ? aplicarSucesso(u) : aplicarTentativaFalha(u, agora)));
}

// --- CRUD ---

export interface NovoUsuario {
  nome: string;
  email: string;
  papel: Papel;
  codigoAtendente: number | null;
}

/**
 * Cria a conta sem senha utilizavel - fica assim ate a pessoa completar o
 * convite (ver convites.ts) e definir a propria senha. hashSenha vazio nunca
 * bate em verificarSenha, entao a conta e criada mas nao loga sozinha.
 */
export function criarUsuario(novo: NovoUsuario): Usuario {
  const email = normalizarEmail(novo.email);
  if (!emailValido(email)) throw new Error(`E-mail invalido: "${novo.email}"`);
  if (buscarPorEmail(email)) throw new Error(`Ja existe uma conta com o e-mail "${email}".`);

  const usuario: Usuario = {
    id: crypto.randomUUID(),
    nome: novo.nome.trim(),
    email,
    hashSenha: "",
    salt: "",
    papel: novo.papel,
    codigoAtendente: novo.codigoAtendente,
    ativo: true,
    tentativasFalhas: 0,
    bloqueadoAte: null,
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

/** Bloqueia o login, preserva o historico, tira a conta de qualquer coisa que dependa de "ativo". */
export function desativarUsuario(usuarioId: string): Usuario {
  return atualizar(usuarioId, (u) => ({ ...u, ativo: false }));
}

export function reativarUsuario(usuarioId: string): Usuario {
  return atualizar(usuarioId, (u) => ({ ...u, ativo: true }));
}
