import fs from "node:fs";
import path from "node:path";

const LOG_FILE = path.join(__dirname, "..", "state", "encaminhamentos.log");
const DRY_RUN_LOG_FILE = path.join(__dirname, "..", "state", "dry-run.log");

export function registrarEncaminhamento(
  numeroChamado: number,
  titulo: string,
  cliente: string,
  atendente: string
): void {
  const linha = `${new Date().toLocaleString("pt-BR")} | Chamado #${numeroChamado} (${cliente} - ${titulo}) -> ${atendente}\n`;
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.appendFileSync(LOG_FILE, linha, "utf-8");
}

/** Mesmo formato do log real, usado no modo DRY_RUN (nada e atribuido de verdade). */
export function registrarDryRun(numeroChamado: number, titulo: string, cliente: string, atendente: string): void {
  const linha = `${new Date().toLocaleString("pt-BR")} | [DRY-RUN] Chamado #${numeroChamado} (${cliente} - ${titulo}) -> ${atendente}\n`;
  fs.mkdirSync(path.dirname(DRY_RUN_LOG_FILE), { recursive: true });
  fs.appendFileSync(DRY_RUN_LOG_FILE, linha, "utf-8");
}
