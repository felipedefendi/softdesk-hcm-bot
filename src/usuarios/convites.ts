import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import type { Convite } from "./tipos";

/**
 * Convites de uso unico: o admin cria o usuario, gera um link e entrega pela
 * mao (Teams) - sem SMTP na v1 (ver PLANO-USUARIOS.md). So o hash do token
 * fica em disco, nunca o token em claro: quem tiver o arquivo (backup,
 * vazamento) nao consegue usar um convite pendente.
 */

const ARQUIVO = path.join(__dirname, "..", "..", "state", "convites.json");

const TAMANHO_TOKEN = 32; // bytes -> 64 chars em hex
const VALIDADE_PADRAO_DIAS = 7;

export function listarConvites(): Convite[] {
  try {
    return JSON.parse(fs.readFileSync(ARQUIVO, "utf-8")) as Convite[];
  } catch {
    return [];
  }
}

function salvar(convites: Convite[]): void {
  fs.mkdirSync(path.dirname(ARQUIVO), { recursive: true });
  fs.writeFileSync(ARQUIVO, JSON.stringify(convites, null, 2));
}

/**
 * SHA-256 simples, nao scrypt: o token e 256 bits de aleatoriedade, nao uma
 * senha escolhida por pessoa - forca bruta contra ele nao e uma ameaca
 * realista, entao nao ha motivo pra pagar o custo de uma KDF lenta aqui.
 */
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/** Pendente: nao usado e ainda dentro do prazo. Pura - nao consulta o relogio sozinha. */
export function conviteValido(convite: Convite, agora: Date): boolean {
  return convite.usadoEm === null && new Date(convite.expiraEm) > agora;
}

/**
 * Gera um convite novo e invalida qualquer outro pendente do mesmo usuario -
 * evita dois links validos ao mesmo tempo (ex.: admin gera um reset novo e
 * esquece do anterior). O token so existe em memoria nesta chamada: quem
 * chama e responsavel por entrega-lo (montar a URL e mandar pelo Teams).
 */
export function gerarConvitePara(usuarioId: string, agora: Date = new Date(), validadeDias = VALIDADE_PADRAO_DIAS): { convite: Convite; token: string } {
  const token = crypto.randomBytes(TAMANHO_TOKEN).toString("hex");
  const convite: Convite = {
    id: crypto.randomUUID(),
    usuarioId,
    hashToken: hashToken(token),
    expiraEm: new Date(agora.getTime() + validadeDias * 24 * 60 * 60 * 1000).toISOString(),
    usadoEm: null,
  };

  const restantes = listarConvites().filter((c) => c.usuarioId !== usuarioId);
  salvar([...restantes, convite]);

  return { convite, token };
}

/** Convite pendente e valido pro token informado, ou null se nao existir/expirou/ja foi usado. */
export function buscarConvitePorToken(token: string, agora: Date = new Date()): Convite | null {
  const alvo = listarConvites().find((c) => c.hashToken === hashToken(token));
  if (!alvo || !conviteValido(alvo, agora)) return null;
  return alvo;
}

export function marcarUsado(conviteId: string, agora: Date = new Date()): void {
  const convites = listarConvites();
  const alvo = convites.find((c) => c.id === conviteId);
  if (!alvo) throw new Error(`Convite nao encontrado: ${conviteId}`);
  alvo.usadoEm = agora.toISOString();
  salvar(convites);
}
