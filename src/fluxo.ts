import { abrirSessao } from "./browser";
import { listarChamadosSemAtendente, ehCategoriaHcm, buscarMinutosEncaminhamento } from "./tickets";
import { atribuirChamado } from "./assign";
import { atendenteAtual, avancarRodizio } from "./rotation";
import { registrarEncaminhamento } from "./log";
import { notificarTeams } from "./teams";
import { lerConfiguracoes } from "./configuracoes";
import { salvarStatus } from "./status";

/**
 * Uma passada completa: lista chamados "Sem atendente", filtra HCM, checa o
 * SLA de Encaminhamento e atribui ao proximo atendente ativo do rodizio
 * quando passar do limite configurado. Usado tanto pelo loop continuo
 * (index.ts) quanto pelo botao "Forcar verificacao agora" do dashboard.
 */
export async function verificarChamados(): Promise<{ processados: number }> {
  const cfg = lerConfiguracoes();
  const { browser, page } = await abrirSessao();
  let processados = 0;

  try {
    const chamados = await listarChamadosSemAtendente(page);
    const hcm = chamados.filter(ehCategoriaHcm);

    for (const chamado of hcm) {
      const minutos = await buscarMinutosEncaminhamento(page, chamado.numero);
      if (minutos < cfg.encaminhamentoLimiteMinutos) continue;

      const atendente = atendenteAtual();
      console.log(
        `[${new Date().toLocaleString("pt-BR")}] Chamado ${chamado.numero} (${chamado.titulo}, ${minutos} min) -> ${atendente}`
      );
      await atribuirChamado(page, chamado.numero, atendente);
      avancarRodizio(atendente);
      registrarEncaminhamento(chamado.numero, chamado.titulo, chamado.cliente, atendente);
      await notificarTeams({
        chamado: chamado.numero,
        titulo: chamado.titulo,
        cliente: chamado.cliente,
        atendente,
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
    await browser.close();
  }
}
