import fs from "node:fs";
import path from "node:path";

const LOG_FILE = path.join(__dirname, "..", "state", "encaminhamentos.log");
const DRY_RUN_LOG_FILE = path.join(__dirname, "..", "state", "dry-run.log");
const DRY_RUN_VISTOS_FILE = path.join(__dirname, "..", "state", "dry-run-vistos.json");

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

function lerVistosNoDryRun(): number[] {
  try {
    return JSON.parse(fs.readFileSync(DRY_RUN_VISTOS_FILE, "utf-8"));
  } catch {
    return [];
  }
}

/**
 * Um chamado ainda aberto continua elegivel em toda verificacao seguinte -
 * sem isso, o mesmo chamado (nunca atribuido de verdade em DRY_RUN) seria
 * recalculado e avancaria o rodizio de novo a cada ciclo, dessincronizando
 * do que aconteceria de verdade.
 */
export function foiRegistradoNoDryRun(numeroChamado: number): boolean {
  return lerVistosNoDryRun().includes(numeroChamado);
}

/** Mesmo formato do log real, usado no modo DRY_RUN (nada e atribuido de verdade). */
export function registrarDryRun(numeroChamado: number, titulo: string, cliente: string, atendente: string): void {
  const linha = `${new Date().toLocaleString("pt-BR")} | [DRY-RUN] Chamado #${numeroChamado} (${cliente} - ${titulo}) -> ${atendente}\n`;
  fs.mkdirSync(path.dirname(DRY_RUN_LOG_FILE), { recursive: true });
  fs.appendFileSync(DRY_RUN_LOG_FILE, linha, "utf-8");

  const vistos = lerVistosNoDryRun();
  vistos.push(numeroChamado);
  fs.writeFileSync(DRY_RUN_VISTOS_FILE, JSON.stringify(vistos), "utf-8");
}
