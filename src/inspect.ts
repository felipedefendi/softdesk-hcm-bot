/**
 * Script de inspecao SOMENTE LEITURA: loga, navega ate "Sem atendente",
 * abre o primeiro chamado da lista e salva screenshots + HTML para analise.
 * NAO clica em nenhum botao de atribuir/encaminhar/fechar.
 */
import fs from "node:fs";
import path from "node:path";
import { abrirSessao } from "./browser";

const OUT_DIR = path.join(__dirname, "..", "debug");

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const { browser, page } = await abrirSessao();

  await page.screenshot({ path: path.join(OUT_DIR, "01-apos-login.png"), fullPage: true });
  fs.writeFileSync(path.join(OUT_DIR, "01-apos-login.html"), await page.content());

  await page.getByText("Sem atendente", { exact: true }).click();
  await page.waitForLoadState("networkidle");
  await page.screenshot({ path: path.join(OUT_DIR, "02-sem-atendente.png"), fullPage: true });
  fs.writeFileSync(path.join(OUT_DIR, "02-sem-atendente.html"), await page.content());

  // Abre o primeiro chamado da lista, apenas para inspecionar a tela (sem clicar em nada dentro dele).
  const primeiroLink = page.locator("a, [role='row'], [role='listitem']").first();
  if (await primeiroLink.count()) {
    await primeiroLink.click();
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: path.join(OUT_DIR, "03-detalhe-chamado.png"), fullPage: true });
    fs.writeFileSync(path.join(OUT_DIR, "03-detalhe-chamado.html"), await page.content());
  }

  console.log(`Arquivos salvos em ${OUT_DIR}`);
  await browser.close();
}

main().catch((err) => {
  console.error("Erro na inspecao:", err);
  process.exit(1);
});
