/** Somente leitura: reproduz o fluxo ate selecionar o atendente, mas fecha com Escape em vez de Salvar. */
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

  await page
    .locator('[content="Encaminhar chamado"], [title="Encaminhar chamado"], [aria-label="Encaminhar chamado"]')
    .first()
    .click();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1000);

  const selectAtendente = page.locator("#section-encaminhar #cd_atendente");
  await selectAtendente.selectOption("76", { force: true });
  await page.waitForTimeout(500);

  await page.screenshot({ path: path.join(OUT_DIR, "15-antes-salvar.png"), fullPage: true });
  fs.writeFileSync(path.join(OUT_DIR, "15-antes-salvar.html"), await page.content());

  await page.keyboard.press("Escape");
  console.log("Print/HTML salvos antes de clicar em Salvar. Nada foi enviado.");
  await browser.close();
}

main().catch((err) => {
  console.error("Erro:", err);
  process.exit(1);
});
