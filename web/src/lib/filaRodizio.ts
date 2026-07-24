/**
 * Monta a fila de passagem do rodizio comecando por "proximo" e dando a
 * volta na lista de atendentes ativos (na ordem cadastrada/exibida na
 * tabela). Equivalente ao ordemAtivosDaTabela + renderFilaRodizio do app.js
 * antigo, mas calculado a partir dos dados - nao le o DOM.
 *
 * Se "proximo" nao estiver entre os ativos (dado ainda carregando, ou fora
 * de sincronia por um instante), devolve so ele - a fila completa aparece
 * assim que os dados baterem.
 */
export function filaRodizio(ativos: string[], proximo: string | null): string[] {
  if (proximo === null) return [];

  const inicio = ativos.indexOf(proximo);
  if (inicio === -1) return [proximo];

  return [...ativos.slice(inicio), ...ativos.slice(0, inicio)];
}
