import crypto from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { buscarPorEmail, buscarPorId } from "../usuarios/usuarios";
import { autenticarNaSenior } from "./senior";
import type { Principal } from "../usuarios/permissoes";

const NOME_COOKIE = "dash_token";
const TTL_SESSAO_MS = 12 * 60 * 60 * 1000; // 12h

/**
 * So o id do usuario fica na sessao, nao o papel nem o resto do cadastro:
 * exigirLogin confere o usuario de novo a cada requisicao (ver abaixo), entao
 * um admin desativando alguem ou mudando o papel dela vale na hora, sem esperar
 * a sessao de 12h expirar.
 */
interface SessaoInfo {
  usuarioId: string;
  expiraEm: number;
}

const sessoesValidas = new Map<string, SessaoInfo>();

declare global {
  namespace Express {
    interface Request {
      /** Preenchido por exigirLogin quando a sessao e valida - quem esta pedindo, pronto pra podeFazer(). */
      sessao?: Principal;
    }
  }
}

function criarSessao(usuarioId: string): string {
  const token = crypto.randomBytes(24).toString("hex");
  sessoesValidas.set(token, { usuarioId, expiraEm: Date.now() + TTL_SESSAO_MS });
  return token;
}

/**
 * Login por pessoa: a senha e validada no Senior X Platform (ver senior.ts),
 * nao mais localmente. O usuarios.json vira so a allowlist + papel/atendente -
 * quem nao esta cadastrado (ou esta inativo) nem chega a bater na Senior, e
 * responde igual a senha errada pra nao revelar quem tem conta.
 *
 * Bloqueio por tentativas e forca-bruta agora sao responsabilidade da Senior
 * (do lado dela) e do fail2ban no nginx; nao ha mais contador local neste
 * caminho.
 */
async function autenticarPorEmail(email: string, senha: string): Promise<{ token: string } | { erro: string }> {
  const usuario = buscarPorEmail(email);
  const GENERICO = { erro: "E-mail ou senha incorretos" };

  if (!usuario) return GENERICO;
  if (!usuario.ativo) return { erro: "Conta desativada. Fale com o administrador." };

  const resultado = await autenticarNaSenior(email, senha);
  if (!resultado.ok) return { erro: resultado.erro };

  return { token: criarSessao(usuario.id) };
}

export async function autenticar(credenciais: { email?: string; senha: string }): Promise<{ token: string } | { erro: string }> {
  const email = credenciais.email?.trim();
  if (!email) return { erro: "Informe seu e-mail." };
  return autenticarPorEmail(email, credenciais.senha);
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

  // Confere que a conta continua ativa a cada requisicao, nao so no momento do
  // login - desativar alguem tem efeito imediato, em vez de so parar de valer
  // quando a sessao de 12h dela expirar sozinha. O usuario buscado aqui vira o
  // Principal direto, sem precisar de uma segunda leitura de usuarios.json em
  // quem for checar permissao depois.
  const usuario = buscarPorId(sessao.usuarioId);
  if (!usuario || !usuario.ativo) {
    sessoesValidas.delete(token);
    res.status(401).json({ erro: "Nao autenticado" });
    return;
  }

  req.sessao = { tipo: "pessoa", usuario };
  next();
}
