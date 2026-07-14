/**
 * Execucao real, unica (nao em loop), com prints e logs detalhados em cada
 * etapa para validar a primeira execucao ponta a ponta.
 */
import fs from "node:fs";
import path from "node:path";
import { config } from "./config";
import { abrirSessao } from "./browser";
import { listarChamadosSemAtendente, ehCategoriaHcm, buscarMinutosEncaminhamento } from "./tickets";
import { atribuirChamado } from "./assign";
import { atendenteAtual, avancarRodizio } from "./rotation";
import { registrarEncaminhamento } from "./log";
import { notificarTeams } from "./teams";

const OUT_DIR = path.join(__dirname, "..", "debug");

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const { browser, page } = await abrirSessao();

  try {
    const chamados = await listarChamadosSemAtendente(page);
    console.log(`Encontrados ${chamados.length} chamados em "Sem atendente":`);
    for (const c of chamados) {
      console.log(`  #${c.numero} - ${c.titulo} - cliente ${c.cliente} - cd_servico ${c.cdServico}`);
    }

    const hcm = chamados.filter(ehCategoriaHcm);
    console.log(`\n${hcm.length} sao HCM (cd_servico 23).`);

    for (const chamado of hcm) {
      const minutos = await buscarMinutosEncaminhamento(page, chamado.numero);
      console.log(`  Chamado ${chamado.numero}: ${minutos} min de encaminhamento`);

      if (minutos < config.encaminhamentoLimiteMinutos) {
        console.log(`    -> ainda nao passou de ${config.encaminhamentoLimiteMinutos} min, pulando.`);
        continue;
      }

      const atendente = atendenteAtual();
      console.log(`    -> atribuindo para ${atendente}...`);

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
      await page.screenshot({
        path: path.join(OUT_DIR, `depois-atribuir-${chamado.numero}.png`),
        fullPage: true,
      });
      console.log(`    -> feito e registrado no log. Print salvo em debug/depois-atribuir-${chamado.numero}.png`);
    }
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("Erro:", err);
  process.exit(1);
});
