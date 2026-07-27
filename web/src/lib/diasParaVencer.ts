export type StatusValidade = "vencida" | "proxima" | "ok" | "sem-data";

export interface InfoValidade {
  status: StatusValidade;
  /** Dias ate a validade (negativo = ja venceu). null quando nao ha data cadastrada. */
  dias: number | null;
}

const LIMITE_PROXIMA_DIAS = 30;

function diferencaDias(de: string, ate: string): number {
  const a = new Date(`${de}T00:00:00`);
  const b = new Date(`${ate}T00:00:00`);
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

/** hoje e validade no formato YYYY-MM-DD. */
export function infoValidade(validade: string | null, hoje: string): InfoValidade {
  if (!validade) return { status: "sem-data", dias: null };

  const dias = diferencaDias(hoje, validade);
  if (dias < 0) return { status: "vencida", dias };
  if (dias <= LIMITE_PROXIMA_DIAS) return { status: "proxima", dias };
  return { status: "ok", dias };
}

const PESO_STATUS: Record<StatusValidade, number> = { vencida: 0, proxima: 1, ok: 2, "sem-data": 3 };

/** Vencidas primeiro, depois proximas (mais urgente primeiro), depois ok, depois sem data. */
export function compararPorValidade(a: string | null, b: string | null, hoje: string): number {
  const ia = infoValidade(a, hoje);
  const ib = infoValidade(b, hoje);
  if (PESO_STATUS[ia.status] !== PESO_STATUS[ib.status]) return PESO_STATUS[ia.status] - PESO_STATUS[ib.status];
  if (ia.dias === null || ib.dias === null) return 0;
  return ia.dias - ib.dias;
}
