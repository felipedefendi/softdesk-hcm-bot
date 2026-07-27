export type StatusSla = "dentro" | "estourado";

export interface SituacaoSla {
  status: StatusSla;
  /** Minutos ate estourar o SLA (negativo = ja estourou ha esses minutos). */
  minutosRestantes: number;
}

/**
 * `minutosDecorridosSla` veio do servidor no momento de `consultadoEm` (o
 * SoftDesk so e consultado a cada 60s); somamos o tempo real passado desde
 * entao pra contagem regressiva continuar "andando" no cliente entre polls.
 */
export function situacaoSla(minutosDecorridosSla: number, limiteMinutos: number, consultadoEm: Date, agora: Date): SituacaoSla {
  const minutosDesdeConsulta = (agora.getTime() - consultadoEm.getTime()) / 60_000;
  const minutosDecorridosAgora = minutosDecorridosSla + minutosDesdeConsulta;
  const minutosRestantes = limiteMinutos - minutosDecorridosAgora;
  return { status: minutosRestantes <= 0 ? "estourado" : "dentro", minutosRestantes };
}

/** "12min" / "1h 05min" / "-3min" (negativo = ha quanto tempo passou do marco). Arredonda pro minuto. */
export function formatarDuracaoMinutos(minutos: number): string {
  const totalMin = Math.round(minutos);
  const sinal = totalMin < 0 ? "-" : "";
  const abs = Math.abs(totalMin);
  const horas = Math.floor(abs / 60);
  const min = abs % 60;
  return horas === 0 ? `${sinal}${min}min` : `${sinal}${horas}h ${String(min).padStart(2, "0")}min`;
}
