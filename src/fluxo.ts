import { abrirSessao, encerrarSessao } from "./sessao";
import { listarChamadosSemAtendente, buscarMinutosEncaminhamento } from "./tickets";
import { atribuirChamado } from "./assign";
import { atendenteAtual, avancarRodizio } from "./rotation";
import { emailTeamsDoAtendente } from "./atendentes";
import { registrarEncaminhamento, registrarDryRun, foiRegistradoNoDryRun } from "./log";
import { notificarTeams, type NotificacaoEncaminhamento } from "./teams";
import { lerConfiguracoes } from "./configuracoes";
import { salvarStatus } from "./status";
import { config } from "./config";

/**
 * Uma passada completa: lista chamados "Sem atendente", checa o SLA de
 * Encaminhamento e atribui ao proximo atendente ativo do rodizio quando
 * passar do limite configurado. Sem filtro de categoria/servico - este login
 * so enxerga chamados do HCM de qualquer forma. Usado tanto pelo loop
 * continuo (index.ts) quanto pelo botao "Forcar verificacao agora" do
 * dashboard.
 */
export async function verificarChamados(): Promise<{ processados: number }> {
  const cfg = lerConfiguracoes();

  if (!cfg.automacaoAtiva) {
    // Revezamento pausado pelo dashboard - nem abre sessao no SoftDesk.
    salvarStatus({
      ultimaExecucao: new Date().toISOString(),
      ultimoErro: null,
      chamadosProcessadosUltimaExecucao: 0,
    });
    return { processados: 0 };
  }

  const sessao = await abrirSessao();
  let processados = 0;
  const notificacoes: NotificacaoEncaminhamento[] = [];

  try {
    const chamados = await listarChamadosSemAtendente(sessao);

    for (const chamado of chamados) {
      const minutos = await buscarMinutosEncaminhamento(sessao, chamado.numero);
      if (minutos < cfg.encaminhamentoLimiteMinutos) continue;

      if (config.dryRun && foiRegistradoNoDryRun(chamado.numero)) {
        // Chamado ja foi calculado numa verificacao anterior e continua
        // aberto (ninguem atribuiu de verdade ainda) - nao recalcula, senao
        // o rodizio avancaria de novo pro mesmo chamado a cada ciclo.
        continue;
      }

      const atendente = atendenteAtual();
      const prefixo = config.dryRun ? "[DRY-RUN] " : "";
      console.log(
        `[${new Date().toLocaleString("pt-BR")}] ${prefixo}Chamado ${chamado.numero} (${chamado.titulo}, ${minutos} min) -> ${atendente}`
      );

      if (config.dryRun) {
        // So calcula e registra quem seria o atendente - nunca abre o painel
        // "Encaminhar chamado" nem envia notificacao real. avancarRodizio
        // ainda roda pra manter o rodizio local em sincronia com o que o bot
        // real ja processou, permitindo comparar os dois logs depois.
        avancarRodizio(atendente);
        registrarDryRun(chamado.numero, chamado.titulo, chamado.cliente, atendente);
        processados++;
        continue;
      }

      await atribuirChamado(sessao, chamado.numero, atendente);
      avancarRodizio(atendente);
      registrarEncaminhamento(chamado.numero, chamado.titulo, chamado.cliente, atendente);
      notificacoes.push({
        chamado: chamado.numero,
        titulo: chamado.titulo,
        cliente: chamado.cliente,
        atendente,
        emailAtendente: emailTeamsDoAtendente(atendente),
        minutosEncaminhamento: minutos,
      });
      processados++;
    }

    salvarStatus({
      ultimaExecucao: new Date().toISOString(),
      ultimoErro: null,
      chamadosProcessadosUltimaExecucao: processados,
    });
    return { processados };
  } catch (err) {
    salvarStatus({
      ultimaExecucao: new Date().toISOString(),
      ultimoErro: err instanceof Error ? err.message : String(err),
    });
    throw err;
  } finally {
    // Envia todas as notificacoes da passada num unico disparo, na ordem em
    // que os chamados foram atribuidos - evita que o Power Automate reordene
    // as mensagens quando ha 2+ chamados. No finally pra que, se a atribuicao
    // de um chamado falhar no meio, os ja atribuidos ainda sejam notificados.
    await notificarTeams(notificacoes);
    await encerrarSessao(sessao);
  }
}
