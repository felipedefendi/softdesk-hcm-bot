import crypto from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { config } from "../config";
import { buscarPorEmail, buscarPorId, contaBloqueada, registrarTentativa, verificarSenha } from "../usuarios/usuarios";

const NOME_COOKIE = "dash_token";
const TTL_SESSAO_MS = 12 * 60 * 60 * 1000; // 12h

/**
 * `usuarioId: null` marca uma sessao da senha compartilhada (legado) - o
 * caminho por pessoa preenche o id de verdade. So o id fica na sessao, nao o
 * papel: assim um admin desativando alguem, ou mudando o papel dela, vale a
 * partir da proxima requisicao, sem esperar a sessao de 12h expirar.
 */
interface SessaoInfo {
  usuarioId: string | null;
  expiraEm: number;
}

const sessoesValidas = new Map<string, SessaoInfo>();

declare global {
  namespace Express {
    interface Request {
      /** Preenchido por exigirLogin quando a sessao e valida. */
      sessao?: { usuarioId: string | null };
    }
  }
}

if (!config.dashboardPassword) {
  throw new Error("Defina DASHBOARD_PASSWORD no arquivo .env");
}

function criarSessao(usuarioId: string | null): string {
  const token = crypto.randomBytes(24).toString("hex");
  sessoesValidas.set(token, { usuarioId, expiraEm: Date.now() + TTL_SESSAO_MS });
  return token;
}

function autenticarComSenhaCompartilhada(senha: string): { token: string } | { erro: string } {
  if (senha !== config.dashboardPassword) return { erro: "Senha incorreta" };
  return { token: criarSessao(null) };
}

/**
 * Login por pessoa (e-mail + senha). Mensagem generica pra e-mail
 * desconhecido e senha errada de proposito - a diferenca entre "esse e-mail
 * nao existe" e "a senha esta errada" e o que permite descobrir, por
 * tentativa, quem tem conta no sistema.
 *
 * Bloqueio ja em vigor sai ANTES de tocar em tentativasFalhas: se checasse a
 * senha mesmo assim, alguem batendo na conta travada ficaria empurrando o
 * proprio bloqueio pra 15 minutos a frente pra sempre, e o dono legitimo
 * nunca conseguiria entrar.
 */
function autenticarPorEmail(email: string, senha: string, agora: Date): { token: string } | { erro: string } {
  const usuario = buscarPorEmail(email);
  const GENERICO = { erro: "E-mail ou senha incorretos" };

  if (!usuario) return GENERICO;
  if (!usuario.ativo) return { erro: "Conta desativada. Fale com o administrador." };
  if (contaBloqueada(usuario, agora)) {
    return { erro: "Conta bloqueada temporariamente por excesso de tentativas. Tente novamente em alguns minutos." };
  }

  if (!verificarSenha(usuario, senha)) {
    registrarTentativa(usuario.id, false, agora);
    return GENERICO;
  }

  registrarTentativa(usuario.id, true, agora);
  return { token: criarSessao(usuario.id) };
}

/** `email` ausente/vazio cai no caminho da senha compartilhada (legado, em paralelo durante a migracao). */
export function autenticar(credenciais: { email?: string; senha: string }, agora: Date = new Date()): { token: string } | { erro: string } {
  if (credenciais.email) return autenticarPorEmail(credenciais.email, credenciais.senha, agora);
  return autenticarComSenhaCompartilhada(credenciais.senha);
}

export function invalidarToken(token: string): void {
  sessoesValidas.delete(token);
}

export { NOME_COOKIE };

export function exigirLogin(req: Request, res: Response, next: NextFunction): void {
  const token = req.cookies?.[NOME_COOKIE];
  const sessao = token ? sessoesValidas.get(token) : undefined;

  if (!sessao || Date.now() >= sessao.expiraEm) {
    if (token) sessoesValidas.delete(token);
    res.status(401).json({ erro: "Nao autenticado" });
    return;
  }

  // Sessao de pessoa: confere que a conta continua ativa a cada requisicao,
  // nao so no momento do login - desativar alguem tem efeito imediato, em vez
  // de so parar de valer quando a sessao de 12h dela expirar sozinha.
  if (sessao.usuarioId !== null) {
    const usuario = buscarPorId(sessao.usuarioId);
    if (!usuario || !usuario.ativo) {
      sessoesValidas.delete(token);
      res.status(401).json({ erro: "Nao autenticado" });
      return;
    }
  }

  req.sessao = { usuarioId: sessao.usuarioId };
  next();
}
