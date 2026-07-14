/** Somente leitura: verifica se os chamados ainda estao em "Sem atendente" (lista) e imprime o SLA/atendente atual de cada um. */
import { abrirSessao } from "./browser";
import { listarChamadosSemAtendente } from "./tickets";

async function main() {
  const { browser, page } = await abrirSessao();

  const chamados = await listarChamadosSemAtendente(page);
  console.log(`Chamados ainda em "Sem atendente": ${chamados.length}`);
  for (const c of chamados) {
    console.log(`  #${c.numero} - ${c.titulo} - cliente ${c.cliente}`);
  }

  // Verifica diretamente o detalhe do 95335 pra ver se tem atendente atribuido.
  const res = await page.request.post("https://js.soft4.com.br/chamado/detalhe/95335/json", {
    headers: { "X-Requested-With": "XMLHttpRequest", Accept: "application/json" },
  });
  const data = await res.json();
  console.log("\nChamado 95335 - nm_atendente / cd_atendente:", data?.chamado?.nm_atendente, data?.chamado?.cd_atendente);

  await browser.close();
}

main().catch((err) => {
  console.error("Erro:", err);
  process.exit(1);
});
