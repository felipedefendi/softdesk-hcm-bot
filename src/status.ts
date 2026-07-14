import fs from "node:fs";
import path from "node:path";

export interface StatusExecucao {
  ultimaExecucao: string | null;
  proximaExecucaoPrevista: string | null;
  ultimoErro: string | null;
  chamadosProcessadosUltimaExecucao: number;
}

const ARQUIVO = path.join(__dirname, "..", "state", "status.json");

const PADRAO: StatusExecucao = {
  ultimaExecucao: null,
  proximaExecucaoPrevista: null,
  ultimoErro: null,
  chamadosProcessadosUltimaExecucao: 0,
};

export function lerStatus(): StatusExecucao {
  try {
    const raw = fs.readFileSync(ARQUIVO, "utf-8");
    return { ...PADRAO, ...(JSON.parse(raw) as Partial<StatusExecucao>) };
  } catch {
    return { ...PADRAO };
  }
}

export function salvarStatus(parcial: Partial<StatusExecucao>): void {
  const atual = lerStatus();
  const novo = { ...atual, ...parcial };
  fs.mkdirSync(path.dirname(ARQUIVO), { recursive: true });
  fs.writeFileSync(ARQUIVO, JSON.stringify(novo, null, 2));
}
