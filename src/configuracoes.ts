import fs from "node:fs";
import path from "node:path";
import { config } from "./config";

export interface Configuracoes {
  pollIntervalMinutes: number;
  encaminhamentoLimiteMinutos: number;
}

const ARQUIVO = path.join(__dirname, "..", "state", "configuracoes.json");

/** Le as configuracoes ajustaveis pelo dashboard, com fallback pros valores padrao do .env/config.ts. */
export function lerConfiguracoes(): Configuracoes {
  try {
    const raw = fs.readFileSync(ARQUIVO, "utf-8");
    return JSON.parse(raw) as Configuracoes;
  } catch {
    return {
      pollIntervalMinutes: config.pollIntervalMinutes,
      encaminhamentoLimiteMinutos: config.encaminhamentoLimiteMinutos,
    };
  }
}

export function salvarConfiguracoes(cfg: Configuracoes): void {
  fs.mkdirSync(path.dirname(ARQUIVO), { recursive: true });
  fs.writeFileSync(ARQUIVO, JSON.stringify(cfg, null, 2));
}
