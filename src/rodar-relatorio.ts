/**
 * Entry point dos relatorios, chamado pelo systemd timer na VM
 * (`dist/rodar-relatorio.js`). Uma execucao, sem loop - o agendamento e do timer.
 *
 * Opcoes:
 *   --teste  posta no TEAMS_WEBHOOK_TESTE_URL em vez do canal real
 *   --json   imprime o payload do card e NAO envia nada
 */
import { config } from "./config";
import { postarNoTeams } from "./teams";
import { comRetentativa, gerarRelatorioDiario } from "./relatorios/gerar";
import { resumirErro } from "./relatorios/erros";
import { montarCardDiario, montarCardFalha } from "./relatorios/cardTeams";
import { diaEmSaoPaulo } from "./relatorios/periodos";

function agora(): string {
  return new Date().toLocaleString("pt-BR");
}

async function main(): Promise<void> {
  const soImprimir = process.argv.includes("--json");
  const usarTeste = process.argv.includes("--teste");
  const webhook = usarTeste ? config.teamsWebhookTesteUrl : config.teamsWebhookUrl;

  if (usarTeste && !webhook) {
    throw new Error("Defina TEAMS_WEBHOOK_TESTE_URL no .env para usar --teste.");
  }

  const momento = new Date();

  try {
    const relatorio = await comRetentativa(() => gerarRelatorioDiario(momento));
    const card = montarCardDiario(relatorio);

    if (soImprimir) {
      console.log(JSON.stringify(card, null, 2));
      return;
    }

    await postarNoTeams(card, "o relatorio diario", webhook);
    console.log(`[${agora()}] Relatorio diario enviado: ${relatorio.total} chamado(s) no dia.`);
  } catch (err) {
    // O silencio seria lido como "dia sem chamado" - avisar que falhou e melhor
    // do que nao aparecer nada no canal.
    if (!soImprimir) {
      const card = montarCardFalha(diaEmSaoPaulo(momento), resumirErro(err));
      await postarNoTeams(card, "a falha do relatorio", webhook);
    }
    throw err;
  }
}

// Sem process.exit() no caminho feliz: forcar a saida enquanto o Playwright
// ainda fecha os handles internos derrubava o node com uma assercao do libuv
// (exit code 9), e o systemd leria isso como falha do relatorio.
main().catch((err) => {
  console.error(`[${agora()}] Erro ao gerar o relatorio: ${resumirErro(err)}`);
  process.exitCode = 1;
});
