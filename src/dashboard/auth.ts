import crypto from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { config } from "../config";

const NOME_COOKIE = "dash_token";
const TTL_SESSAO_MS = 12 * 60 * 60 * 1000; // 12h

// token -> timestamp de expiracao
const tokensValidos = new Map<string, number>();

if (!config.dashboardPassword) {
  throw new Error("Defina DASHBOARD_PASSWORD no arquivo .env");
}

/** Confere a senha e, se correta, gera um token de sessao valido por TTL_SESSAO_MS. */
export function autenticar(senha: string): string | null {
  if (senha !== config.dashboardPassword) return null;
  const token = crypto.randomBytes(24).toString("hex");
  tokensValidos.set(token, Date.now() + TTL_SESSAO_MS);
  return token;
}

export function invalidarToken(token: string): void {
  tokensValidos.delete(token);
}

export { NOME_COOKIE };

export function exigirLogin(req: Request, res: Response, next: NextFunction): void {
  const token = req.cookies?.[NOME_COOKIE];
  const expiraEm = token ? tokensValidos.get(token) : undefined;

  if (expiraEm !== undefined) {
    if (Date.now() < expiraEm) {
      next();
      return;
    }
    tokensValidos.delete(token);
  }

  res.status(401).json({ erro: "Nao autenticado" });
}
