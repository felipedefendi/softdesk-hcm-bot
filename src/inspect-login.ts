/** Inspeciona apenas a tela de login (sem preencher nada) para achar os seletores reais. */
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { config } from "./config";

const OUT_DIR = path.join(__dirname, "..", "debug");

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(config.softdeskUrl);
  await page.waitForLoadState("networkidle");

  await page.screenshot({ path: path.join(OUT_DIR, "00-login.png"), fullPage: true });
  fs.writeFileSync(path.join(OUT_DIR, "00-login.html"), await page.content());

  const inputs = await page.locator("input").evaluateAll((els) =>
    els.map((el) => ({
      tag: el.tagName,
      type: (el as HTMLInputElement).type,
      name: (el as HTMLInputElement).name,
      id: el.id,
      placeholder: (el as HTMLInputElement).placeholder,
    }))
  );
  console.log("INPUTS:", JSON.stringify(inputs, null, 2));

  const buttons = await page.locator("button").evaluateAll((els) =>
    els.map((el) => ({ text: el.textContent?.trim(), id: el.id, className: el.className }))
  );
  console.log("BUTTONS:", JSON.stringify(buttons, null, 2));

  await browser.close();
}

main().catch((err) => {
  console.error("Erro:", err);
  process.exit(1);
});
