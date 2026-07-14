import { config } from "./config";
import { lerConfiguracoes } from "./configuracoes";
import { salvarStatus } from "./status";
import { verificarChamados } from "./fluxo";

async function ciclo(): Promise<void> {
  await verificarChamados().catch((err) => console.error("Erro na verificacao:", err));

  const cfg = lerConfiguracoes();
  const proxima = new Date(Date.now() + cfg.pollIntervalMinutes * 60 * 1000);
  salvarStatus({ proximaExecucaoPrevista: proxima.toISOString() });

  setTimeout(ciclo, cfg.pollIntervalMinutes * 60 * 1000);
}

console.log(
  `Iniciando monitoramento (intervalo padrao ${config.pollIntervalMinutes} min, ajustavel pelo dashboard)...`
);
ciclo();
