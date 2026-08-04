import { abrirSessao, encerrarSessao } from "./sessao";
import { listarChamadosSemAtendente, buscarInfoEncaminhamento } from "./tickets";
import { atribuirChamado } from "./assign";
import { atendenteAtual, avancarRodizio } from "./rotation";
import { emailTeamsDoAtendente } from "./atendentes";
import { registrarEncaminhamento, registrarDryRun, foiRegistradoNoDryRun } from "./log";
import { notificarTeams, type NotificacaoEncaminhamento } from "./teams";
import { lerConfiguracoes } from "./configuracoes";
import { salvarStatus } from "./status";
import { registrarExecucao } from "./execucoes";
import { resumirErro } from "./relatorios/erros";
import { diaEmSaoPaulo, horaEmSaoPaulo } from "./relatorios/periodos";
import { lerDiasEspeciais } from "./agenda/armazenamento";
import { estadoDoDia } from "./agenda/regras";
import { config } from "./config";

/**
 * Fecha a passada sem ter aberto sessao no SoftDesk. Registrar mesmo assim
 * mantem a Saude do bot honesta: sem isso, um feriado pareceria bot morto.
 */
function passadaVazia(inicio: Date): { processados: number } {
  salvarStatus({
    ultimaExecucao: new Date().toISOString(),
    ultimoErro: null,
    chamadosProcessadosUltimaExecucao: 0,
  });
  registrarExecucao({ inicio: inicio.toISOString(), duracaoMs: Date.now() - inicio.getTime(), processados: 0, erro: null });
  return { processados: 0 };
}

/**
 * Uma passada completa: lista chamados "Sem atendente", checa o SLA de
 * Encaminhamento e atribui ao proximo atendente ativo do rodizio quando
 * passar do limite configurado. Sem filtro de categoria/servico - este login
 * so enxerga chamados do HCM de qualquer forma. Usado tanto pelo loop
 * continuo (index.ts) quanto pelo botao "Forcar verificacao agora" do
 * dashboard.
 */
export async function verificarChamados(): Promise<{ processados: number }> {
  const inicio = new Date();
  const cfg = lerConfiguracoes();

  if (!cfg.automacaoAtiva) {
    // Revezamento pausado pelo dashboard - nem abre sessao no SoftDesk.
    return passadaVazia(inicio);
  }

  // Feriado, ponto facultativo ou expediente reduzido cadastrado na Agenda.
  // Os chamados nao se perdem: listarChamadosSemAtendente relista tudo a cada
  // passada, entao o que chegar durante a pausa e encaminhado de uma vez na
  // primeira passada valida.
  const agenda = estadoDoDia(diaEmSaoPaulo(), horaEmSaoPaulo(), lerDiasEspeciais());
  if (agenda.rodizio !== "liberado") {
    const detalhe =
      agenda.rodizio === "bloqueado" ? "dia bloqueado" : `fora do expediente de hoje (${agenda.inicio} as ${agenda.fim})`;
    console.log(`[${new Date().toLocaleString("pt-BR")}] Revezamento parado: ${detalhe} - ${agenda.motivo}.`);
    return passadaVazia(inicio);
  }

  const sessao = await abrirSessao();
  let processados = 0;
  const notificacoes: NotificacaoEncaminhamento[] = [];

  try {
    const chamados = await listarChamadosSemAtendente(sessao);

    for (const chamado of chamados) {
      const info = await buscarInfoEncaminhamento(sessao, chamado.numero);
      const minutos = info.minutos;
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
        solicitante: info.solicitante,
        emailSolicitante: info.email,
        telefoneSolicitante: info.telefone,
      });
      processados++;
    }

    salvarStatus({
      ultimaExecucao: new Date().toISOString(),
      ultimoErro: null,
      chamadosProcessadosUltimaExecucao: processados,
    });
    registrarExecucao({ inicio: inicio.toISOString(), duracaoMs: Date.now() - inicio.getTime(), processados, erro: null });
    return { processados };
  } catch (err) {
    // resumirErro corta o call log do Playwright (que carrega o cookie de sessao) antes
    // de qualquer coisa persistir esse erro - status.json e servido pelo /api/status.
    const mensagem = resumirErro(err);
    salvarStatus({
      ultimaExecucao: new Date().toISOString(),
      ultimoErro: mensagem,
    });
    registrarExecucao({ inicio: inicio.toISOString(), duracaoMs: Date.now() - inicio.getTime(), processados, erro: mensagem });
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
