import { buscarAtendentesSoftDesk } from "./atendentesSoftDesk";
import { listarAtendentes } from "./atendentes";

/**
 * Lista os atendentes do SoftDesk com o codigo que o bot usa pra encaminhar e
 * marca quem ja esta no rodizio. So leitura. Ver atendentesSoftDesk.ts.
 *
 * Na VM: cd ~/softdesk-hcm-bot && node dist/listar-atendentes-softdesk.js
 */
async function main(): Promise<void> {
  const atendentes = await buscarAtendentesSoftDesk();
  if (atendentes.length === 0) {
    console.log("O SoftDesk devolveu a lista de atendentes vazia.");
    process.exitCode = 1;
    return;
  }

  const noRodizio = new Map(listarAtendentes().map((a) => [a.codigoAtendente, a]));
  console.log(`${atendentes.length} atendentes no SoftDesk:\n`);
  console.log("Codigo  Nome                            Rodizio         Um dos grupos de solucao");
  for (const a of atendentes) {
    const local = noRodizio.get(a.codigo);
    const rodizio = local ? (local.ativo ? "sim" : "sim (inativo)") : "-";
    const status = a.ativo ? "" : "  [inativo no SoftDesk]";
    console.log(`${String(a.codigo).padEnd(8)}${a.nome.padEnd(32)}${rodizio.padEnd(16)}${a.grupo}${status}`);
  }
}

main().catch((err) => {
  console.error("Erro:", err instanceof Error ? err.message : err);
  process.exit(1);
});
