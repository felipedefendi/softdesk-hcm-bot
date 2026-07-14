/** Somente leitura: abre o chamado 95335 (Sem atendente) e captura a toolbar antes de clicar em qualquer coisa. */
import fs from "node:fs";
import path from "node:path";
import { abrirSessao } from "./browser";

const OUT_DIR = path.join(__dirname, "..", "debug");

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const { browser, page } = await abrirSessao();

  await page.getByText("Sem atendente", { exact: true }).click();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1000);

  await page.getByText("95335", { exact: false }).first().click();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1000);

  await page.screenshot({ path: path.join(OUT_DIR, "14-toolbar-sem-atendente.png"), fullPage: true });
  fs.writeFileSync(path.join(OUT_DIR, "14-toolbar-sem-atendente.html"), await page.content());

  console.log("Print e HTML salvos. Nenhum botao de acao foi clicado.");
  await browser.close();
}

main().catch((err) => {
  console.error("Erro:", err);
  process.exit(1);
});
