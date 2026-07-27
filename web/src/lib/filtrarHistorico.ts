import type { EntradaLog } from "../api/tipos";

export interface FiltroHistorico {
  /** Busca por texto: casa contra numero do chamado, cliente/titulo e atendente (case-insensitive). */
  busca: string;
  /** "YYYY-MM-DD" (valor cru de <input type="date">) ou null = sem limite inferior. */
  desde: string | null;
  /** "YYYY-MM-DD" ou null = sem limite superior. */
  ate: string | null;
}

/** "DD/MM/YYYY, HH:MM:SS" (formato gravado pelo log.ts) -> "YYYY-MM-DD", comparavel como string. */
function paraDataComparavel(horario: string | null): string | null {
  const match = horario?.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (!match) return null;
  const [, dia, mes, ano] = match;
  return `${ano}-${mes}-${dia}`;
}

export function filtrarHistorico(entradas: EntradaLog[], filtro: FiltroHistorico): EntradaLog[] {
  const busca = filtro.busca.trim().toLowerCase();

  return entradas.filter((entrada) => {
    if (busca) {
      const alvo = [
        entrada.chamado !== null ? String(entrada.chamado) : "",
        entrada.clienteETitulo ?? "",
        entrada.atendente ?? "",
        entrada.linhaOriginal,
      ]
        .join(" ")
        .toLowerCase();
      if (!alvo.includes(busca)) return false;
    }

    const data = paraDataComparavel(entrada.horario);
    if (filtro.desde && (!data || data < filtro.desde)) return false;
    if (filtro.ate && (!data || data > filtro.ate)) return false;

    return true;
  });
}
