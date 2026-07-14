import fs from "node:fs";
import path from "node:path";

const LOG_FILE = path.join(__dirname, "..", "state", "encaminhamentos.log");

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
