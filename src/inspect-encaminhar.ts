/**
 * Somente VISUALIZACAO: abre o chamado 95112, abre o painel "Encaminhar chamado"
 * para ver os campos/atendentes disponiveis, tira print e fecha com Escape.
 * NUNCA clica em Confirmar/Salvar/Encaminhar.
 */
import fs from "node:fs";
import path from "node:path";
import { abrirSessao } from "./browser";

const OUT_DIR = path.join(__dirname, "..", "debug");

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const { browser, page } = await abrirSessao();

  const chamadas: Array<{ url: string; method: string; status: number; body: string }> = [];
  page.on("response", async (res) => {
    const req = res.request();
    if (["xhr", "fetch"].includes(req.resourceType())) {
      let body = "";
      try {
        body = await res.text();
      } catch {
        body = "<sem corpo>";
      }
      chamadas.push({ url: res.url(), method: req.method(), status: res.status(), body });
    }
  });

  await page.getByText("Aguardando solicitante", { exact: true }).click();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1500);

  await page.getByText("Calculo de ferias", { exact: false }).first().click();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1500);

  const botaoEncaminhar = page
    .locator('[title="Encaminhar chamado"], [aria-label="Encaminhar chamado"]')
    .first();
  const existeBotaoComTitulo = await botaoEncaminhar.count();

  if (existeBotaoComTitulo) {
    await botaoEncaminhar.click();
  } else {
    // fallback: primeiro icone da toolbar (posicao 1 = "Encaminhar chamado" conforme barra_ferramenta)
    await page.locator("i.fa-arrow-circle-right, i[class*='arrow-circle-right']").first().click();
  }

  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1500);

  await page.screenshot({ path: path.join(OUT_DIR, "10-painel-encaminhar.png"), fullPage: true });
  fs.writeFileSync(path.join(OUT_DIR, "10-painel-encaminhar.html"), await page.content());

  // Fecha sem confirmar nada
  await page.keyboard.press("Escape");
  await page.waitForTimeout(500);

  fs.writeFileSync(path.join(OUT_DIR, "11-network-encaminhar.json"), JSON.stringify(chamadas, null, 2));
  console.log(`Capturadas ${chamadas.length} chamadas. Painel fechado com Escape (nada foi enviado).`);
  await browser.close();
}

main().catch((err) => {
  console.error("Erro:", err);
  process.exit(1);
});
