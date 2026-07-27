/** Mais de 2x o intervalo configurado sem uma execucao e sinal de que o loop travou/caiu. */
export function estaAtrasada(ultimaExecucao: string | null, intervaloMinutos: number, agora: Date): boolean {
  if (!ultimaExecucao) return false;
  const minutosDesde = (agora.getTime() - new Date(ultimaExecucao).getTime()) / 60_000;
  return minutosDesde > intervaloMinutos * 2;
}

/** Corta com reticencias quando passa do limite; texto dentro do limite volta intacto. */
export function truncar(texto: string, maxChars: number): string {
  if (texto.length <= maxChars) return texto;
  return `${texto.slice(0, maxChars).trimEnd()}…`;
}
