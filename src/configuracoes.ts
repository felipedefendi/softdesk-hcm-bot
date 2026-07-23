import fs from "node:fs";
import path from "node:path";
import { config } from "./config";

export interface Configuracoes {
  pollIntervalMinutes: number;
  encaminhamentoLimiteMinutos: number;
  automacaoAtiva: boolean;
  /**
   * Dias uteis sem receber chamado a partir dos quais o dashboard sinaliza um
   * atendente ativo como possivel rodizio travado.
   */
  diasSemReceberParaAlerta: number;
}

/** Uma semana inteira de trabalho sem receber nada - improvavel sem defeito. */
const DIAS_SEM_RECEBER_PADRAO = 5;

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
      diasSemReceberParaAlerta: salvo.diasSemReceberParaAlerta ?? DIAS_SEM_RECEBER_PADRAO,
    };
  } catch {
    return {
      pollIntervalMinutes: config.pollIntervalMinutes,
      encaminhamentoLimiteMinutos: config.encaminhamentoLimiteMinutos,
      automacaoAtiva: true,
      diasSemReceberParaAlerta: DIAS_SEM_RECEBER_PADRAO,
    };
  }
}

export function salvarConfiguracoes(cfg: Configuracoes): void {
  fs.mkdirSync(path.dirname(ARQUIVO), { recursive: true });
  fs.writeFileSync(ARQUIVO, JSON.stringify(cfg, null, 2));
}
