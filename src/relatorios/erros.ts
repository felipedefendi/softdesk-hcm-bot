/**
 * So a primeira linha da mensagem de erro.
 *
 * O Playwright anexa o "call log" completo no `message` da excecao - com URL,
 * headers e o **cookie de sessao**. Sem esse corte, o segredo vaza pro log da VM
 * e, pior, pro card de falha postado no Teams.
 */
export function resumirErro(err: unknown): string {
  const texto = err instanceof Error ? err.message : String(err);
  return texto.split("\n")[0].trim();
}
