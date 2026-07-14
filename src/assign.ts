import type { Page } from "playwright";
import { codigoDoAtendente } from "./atendentes";

/** cd_tipo_atividade = 11 -> "ENC - Encaminhamento de Chamado" (confirmado no dropdown do painel). */
const CODIGO_TIPO_ATIVIDADE_ENCAMINHAMENTO = "11";

/**
 * Abre a aba "Sem atendente", abre o chamado pelo numero, abre o painel
 * "Encaminhar chamado", escolhe o atendente e salva.
 */
export async function atribuirChamado(page: Page, numeroChamado: number, atendente: string): Promise<void> {
  const codigo = codigoDoAtendente(atendente);

  await page.getByText("Sem atendente", { exact: true }).click();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1000);

  await page.getByText(String(numeroChamado), { exact: false }).first().click();
  await page.waitForLoadState("networkidle");

  await page
    .locator('[content="Encaminhar chamado"], [title="Encaminhar chamado"], [aria-label="Encaminhar chamado"]')
    .first()
    .click();
  await page.waitForLoadState("networkidle");

  const selectAtendente = page.locator("#section-encaminhar #cd_atendente");
  await selectAtendente.selectOption(String(codigo), { force: true });

  // "Acompanhar o chamado apos encaminhar" so faz sentido quando o atendente e o proprio
  // usuario logado (Felipe Prado). Para qualquer outro atendente, desmarcar.
  if (atendente !== "Felipe Prado") {
    const acompanhar = page.locator('#section-encaminhar input[name="flag_acompanhar"]');
    if (await acompanhar.count()) {
      await acompanhar.uncheck({ force: true });
    }
  }

  // Campos obrigatorios do registro de atividade do encaminhamento.
  await page.locator("#cd_tipo_atividade").selectOption(CODIGO_TIPO_ATIVIDADE_ENCAMINHAMENTO, { force: true });
  await page.locator("#tempo_gasto").fill("00:01");
  await page.locator('input[name="fl_exibir_atividade"][value="false"]').click({ force: true });

  await page.getByRole("button", { name: "Salvar" }).click();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1000);

  const painelAindaVisivel = await page.locator("#section-encaminhar").first().isVisible().catch(() => false);
  const temErroValidacao = (await page.getByText("Campo obrigatório").count()) > 0;
  if (painelAindaVisivel || temErroValidacao) {
    throw new Error(
      `Salvar nao foi confirmado para o chamado ${numeroChamado}: painel ainda aberto ou erro de validacao na tela.`
    );
  }
}
