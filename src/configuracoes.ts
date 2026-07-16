import fs from "node:fs";
import path from "node:path";
import { config } from "./config";

export interface Configuracoes {
  pollIntervalMinutes: number;
  encaminhamentoLimiteMinutos: number;
  automacaoAtiva: boolean;
}

const ARQUIVO = path.join(__dirname, "..", "state", "configuracoes.json");

/** Le as configuracoes ajustaveis pelo dashboard, com fallback pros valores padrao do .env/config.ts. */
export function lerConfiguracoes(): Configuracoes {
  try {
    const raw = fs.readFileSync(ARQUIVO, "utf-8");
    const salvo = JSON.parse(raw) as Partial<Configuracoes>;
    return {
      pollIntervalMinutes: salvo.pollIntervalMinutes ?? config.pollIntervalMinutes,
      encaminhamentoLimiteMinutos: salvo.encaminhamentoLimiteMinutos ?? config.encaminhamentoLimiteMinutos,
      automacaoAtiva: salvo.automacaoAtiva ?? true,
    };
  } catch {
    return {
      pollIntervalMinutes: config.pollIntervalMinutes,
      encaminhamentoLimiteMinutos: config.encaminhamentoLimiteMinutos,
      automacaoAtiva: true,
    };
  }
}

export function salvarConfiguracoes(cfg: Configuracoes): void {
  fs.mkdirSync(path.dirname(ARQUIVO), { recursive: true });
  fs.writeFileSync(ARQUIVO, JSON.stringify(cfg, null, 2));
}
