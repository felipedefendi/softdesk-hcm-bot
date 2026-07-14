/**
 * Somente leitura: abre uma fila que tem chamados agora ("Aguardando solicitante")
 * para descobrir o formato JSON de um chamado (categoria, SLA etc). Depois abre o
 * primeiro chamado (so para ver o detalhe), sem clicar em nenhum botao de acao.
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
  await page.screenshot({ path: path.join(OUT_DIR, "05-aguardando-solicitante.png"), fullPage: true });

  // Abre o primeiro chamado da lista so para ver o detalhe (sem clicar em acoes).
  const primeiraLinha = page.locator("tr, .list-group-item, [role='row']").filter({ hasText: /\d/ }).first();
  if (await primeiraLinha.count()) {
    await primeiraLinha.click();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(OUT_DIR, "06-detalhe.png"), fullPage: true });
  }

  fs.writeFileSync(path.join(OUT_DIR, "07-network-populado.json"), JSON.stringify(chamadas, null, 2));
  console.log(`Capturadas ${chamadas.length} chamadas. Salvo em debug/07-network-populado.json`);
  await browser.close();
}

main().catch((err) => {
  console.error("Erro:", err);
  process.exit(1);
});
