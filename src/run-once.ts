/**
 * Execucao real, unica (nao em loop), com prints e logs detalhados em cada
 * etapa para validar a primeira execucao ponta a ponta.
 */
import { config } from "./config";
import { abrirSessao, encerrarSessao } from "./sessao";
import { listarChamadosSemAtendente, buscarMinutosEncaminhamento } from "./tickets";
import { atribuirChamado } from "./assign";
import { atendenteAtual, avancarRodizio } from "./rotation";
import { registrarEncaminhamento } from "./log";
import { notificarTeams } from "./teams";

async function main() {
  const sessao = await abrirSessao();

  try {
    const chamados = await listarChamadosSemAtendente(sessao);
    console.log(`Encontrados ${chamados.length} chamados em "Sem atendente":`);
    for (const c of chamados) {
      console.log(`  #${c.numero} - ${c.titulo} - cliente ${c.cliente} - cd_servico ${c.cdServico}`);
    }

    for (const chamado of chamados) {
      const minutos = await buscarMinutosEncaminhamento(sessao, chamado.numero);
      console.log(`  Chamado ${chamado.numero}: ${minutos} min de encaminhamento`);

      if (minutos < config.encaminhamentoLimiteMinutos) {
        console.log(`    -> ainda nao passou de ${config.encaminhamentoLimiteMinutos} min, pulando.`);
        continue;
      }

      const atendente = atendenteAtual();
      console.log(`    -> atribuindo para ${atendente}...`);

      await atribuirChamado(sessao, chamado.numero, atendente);
      avancarRodizio(atendente);
      registrarEncaminhamento(chamado.numero, chamado.titulo, chamado.cliente, atendente);
      await notificarTeams([
        {
          chamado: chamado.numero,
          titulo: chamado.titulo,
          cliente: chamado.cliente,
          atendente,
          minutosEncaminhamento: minutos,
        },
      ]);
      console.log(`    -> feito e registrado no log.`);
    }
  } finally {
    await encerrarSessao(sessao);
  }
}

main().catch((err) => {
  console.error("Erro:", err);
  process.exit(1);
});
