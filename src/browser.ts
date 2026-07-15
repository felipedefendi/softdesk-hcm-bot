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
  // Espera sair da tela de login e o app carregar de fato. "networkidle" nao
  // e confiavel aqui: a pagina mantem alguma conexao persistente (polling ou
  // websocket) que nunca deixa a rede "parada".
  await page.waitForURL((url) => url.pathname === "/chamado", { timeout: 15000 });
  await page.getByText("Novo chamado", { exact: true }).first().waitFor({ state: "visible", timeout: 30000 });

  return { browser, page };
}
