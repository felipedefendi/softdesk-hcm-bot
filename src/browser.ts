import { chromium, type Browser, type Page } from "playwright";
import { config } from "./config";

export async function abrirSessao(): Promise<{ browser: Browser; page: Page }> {
  const browser = await chromium.launch({ headless: config.headless });
  const page = await browser.newPage();
  await page.goto(config.softdeskUrl);

  await page.locator('input[name="lg_usuario"]').first().fill(config.email);
  await page.locator('input[name="sh_usuario"]').first().fill(config.password);

  // Login como "Atendente" (nao "Solicitante") - ver print da tela de login.
  await page.locator("button", { hasText: "Atendente" }).first().click();
  await page.waitForLoadState("networkidle");

  return { browser, page };
}
