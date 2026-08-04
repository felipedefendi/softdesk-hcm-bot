import type { DiaEspecial, Ferias } from "../api/tipos";

/**
 * Monta a grade de um mes com o que a Agenda diz sobre cada dia. Funcao pura:
 * a tela so desenha o que sai daqui.
 *
 * A aritmetica usa Date.UTC de proposito - datas civis nao tem horario, e
 * operar em UTC evita que horario de verao mude a conta de "somar um dia"
 * (mesmo motivo do periodos.ts no backend).
 */

export interface CelulaDia {
  /** YYYY-MM-DD */
  data: string;
  dia: number;
  /** false = dia do mes vizinho, so preenchendo a semana. */
  doMes: boolean;
  fimDeSemana: boolean;
  especial: DiaEspecial | null;
  /** Quem esta de ferias neste dia, na ordem em que veio da API. */
  ferias: Ferias[];
}

const DIAS_NA_SEMANA = 7;

function iso(d: Date): string {
  const mes = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dia = String(d.getUTCDate()).padStart(2, "0");
  return `${d.getUTCFullYear()}-${mes}-${dia}`;
}

/** `mes` e 1-12. Retorna semanas de 7 celulas, comecando no domingo. */
export function gradeDoMes(ano: number, mes: number, especiais: DiaEspecial[], ferias: Ferias[]): CelulaDia[][] {
  const porData = new Map(especiais.map((e) => [e.data, e]));

  // Dia 0 do mes seguinte e o ultimo dia deste mes.
  const diasNoMes = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
  const recuoAteDomingo = new Date(Date.UTC(ano, mes - 1, 1)).getUTCDay();
  const totalDeCelulas = Math.ceil((recuoAteDomingo + diasNoMes) / DIAS_NA_SEMANA) * DIAS_NA_SEMANA;

  const semanas: CelulaDia[][] = [];

  for (let i = 0; i < totalDeCelulas; i++) {
    const atual = new Date(Date.UTC(ano, mes - 1, 1 - recuoAteDomingo + i));
    const data = iso(atual);
    const semana = atual.getUTCDay();

    if (i % DIAS_NA_SEMANA === 0) semanas.push([]);
    semanas[semanas.length - 1].push({
      data,
      dia: atual.getUTCDate(),
      doMes: atual.getUTCMonth() === mes - 1,
      fimDeSemana: semana === 0 || semana === 6,
      especial: porData.get(data) ?? null,
      ferias: ferias.filter((f) => f.inicio <= data && data <= f.fim),
    });
  }

  return semanas;
}

/** Rotulo curto do que acontece no dia, ou null se for dia normal. */
export function resumoDoDia(celula: CelulaDia): string | null {
  if (celula.especial?.tipo === "bloqueado") return "Sem expediente";
  if (celula.especial?.tipo === "janela") return `${celula.especial.inicio}–${celula.especial.fim}`;
  return null;
}
