import crypto from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { config } from "../config";

const NOME_COOKIE = "dash_token";
const tokensValidos = new Set<string>();

if (!config.dashboardPassword) {
  throw new Error("Defina DASHBOARD_PASSWORD no arquivo .env");
}

/** Confere a senha e, se correta, gera um token de sessao valido. */
export function autenticar(senha: string): string | null {
  if (senha !== config.dashboardPassword) return null;
  const token = crypto.randomBytes(24).toString("hex");
  tokensValidos.add(token);
  return token;
}

export function invalidarToken(token: string): void {
  tokensValidos.delete(token);
}

export { NOME_COOKIE };

export function exigirLogin(req: Request, res: Response, next: NextFunction): void {
  const token = req.cookies?.[NOME_COOKIE];
  if (token && tokensValidos.has(token)) {
    next();
    return;
  }
  res.status(401).json({ erro: "Nao autenticado" });
}
