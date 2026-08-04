export interface CursorMes {
  ano: number;
  /** 1-12. */
  mes: number;
}

/**
 * Avanca (ou recua) `passo` meses. Pura porque a versao anterior, inline no
 * componente, tinha um `% 12000` de "seguranca" que zerava o ano: agosto/2026
 * + 1 virava setembro/26, e ai o calendario nao achava nada cadastrado e o
 * botao de feriados pedia um ano que o servidor recusa.
 *
 * Nao ha limite artificial: `ano * 12 + mes` cresce sem overflow em qualquer
 * ano que um calendario de painel vai ver.
 */
export function andarMes({ ano, mes }: CursorMes, passo: number): CursorMes {
  const total = ano * 12 + (mes - 1) + passo;
  return { ano: Math.floor(total / 12), mes: (total % 12) + 1 };
}
