/**
 * Somente VISUALIZACAO: abre o painel "Encaminhar chamado" e clica no campo
 * "Atendente" para ver a lista de opcoes (nomes + codigos). NAO seleciona
 * nenhuma opcao, NAO clica em Salvar - fecha com Escape.
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
  if (await botaoEncaminhar.count()) {
    await botaoEncaminhar.click();
  } else {
    await page.locator("i.fa-arrow-circle-right, i[class*='arrow-circle-right']").first().click();
  }
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1000);

  // Clica no campo "Atendente" (dropdown) so para abrir a lista - sem selecionar nada.
  const campoAtendente = page.getByText("Atendente", { exact: false }).locator("..").locator("input, [role='combobox']").first();
  const campoPorPlaceholder = page.locator('input[placeholder*="tendente" i]').first();

  if (await campoPorPlaceholder.count()) {
    await campoPorPlaceholder.click();
  } else if (await campoAtendente.count()) {
    await campoAtendente.click();
  } else {
    // fallback: o dropdown fica logo abaixo do label "Atendente - Opcional"
    await page.locator("text=Atendente").first().click();
  }

  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(OUT_DIR, "12-dropdown-atendente.png"), fullPage: true });
  fs.writeFileSync(path.join(OUT_DIR, "12-dropdown-atendente.html"), await page.content());

  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
  await page.keyboard.press("Escape");

  fs.writeFileSync(path.join(OUT_DIR, "13-network-atendentes.json"), JSON.stringify(chamadas, null, 2));
  console.log(`Capturadas ${chamadas.length} chamadas. Nada foi salvo/enviado.`);
  await browser.close();
}

main().catch((err) => {
  console.error("Erro:", err);
  process.exit(1);
});
