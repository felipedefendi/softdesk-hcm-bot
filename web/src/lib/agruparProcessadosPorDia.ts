import type { Execucao } from "../api/tipos";

export interface DiaProcessados {
  /** YYYY-MM-DD. */
  dia: string;
  total: number;
}

/** Ultimos `dias` dias (incluindo hoje), com zero nos dias sem execucao. `hoje` no formato YYYY-MM-DD. */
export function agruparProcessadosPorDia(execucoes: Execucao[], hoje: string, dias: number): DiaProcessados[] {
  const porDia = new Map<string, number>();
  for (const e of execucoes) {
    const dia = e.inicio.slice(0, 10);
    porDia.set(dia, (porDia.get(dia) ?? 0) + e.processados);
  }

  const resultado: DiaProcessados[] = [];
  const base = new Date(`${hoje}T00:00:00.000Z`);
  for (let i = dias - 1; i >= 0; i--) {
    const data = new Date(base);
    data.setUTCDate(data.getUTCDate() - i);
    const chave = data.toISOString().slice(0, 10);
    resultado.push({ dia: chave, total: porDia.get(chave) ?? 0 });
  }
  return resultado;
}
