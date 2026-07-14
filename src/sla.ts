/**
 * Converte o tempo decorrido do SLA "Encaminhamento" (formato HH:MM exibido no
 * SoftDesk, ex.: "00:21") para minutos. Ex.: "00:21" -> 21 minutos.
 */
export function tempoDecorridoEmMinutos(texto: string): number {
  const match = texto.trim().match(/^(\d+):(\d{2})$/);
  if (!match) {
    throw new Error(`Formato de tempo de SLA inesperado: "${texto}"`);
  }
  const [, horas, minutos] = match;
  return Number(horas) * 60 + Number(minutos);
}
