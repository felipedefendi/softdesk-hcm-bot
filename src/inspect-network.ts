/** Inspeciona as chamadas de rede (XHR/fetch) ao clicar em "Sem atendente". Somente leitura. */
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

  await page.getByText("Sem atendente", { exact: true }).click();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);

  await page.screenshot({ path: path.join(OUT_DIR, "04-sem-atendente-espera.png"), fullPage: true });
  fs.writeFileSync(path.join(OUT_DIR, "04-network.json"), JSON.stringify(chamadas, null, 2));

  console.log(`Capturadas ${chamadas.length} chamadas XHR/fetch. Salvo em debug/04-network.json`);
  await browser.close();
}

main().catch((err) => {
  console.error("Erro:", err);
  process.exit(1);
});
