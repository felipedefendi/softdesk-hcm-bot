/**
 * As formas que ficam em disco (state/dias-especiais.json e state/ferias.json).
 * O frontend espelha estes tipos em web/src/api/tipos.ts.
 */

/**
 * Um dia com expediente diferente do normal.
 *
 * "Bloqueado" e a janela vazia: desligar o revezamento o dia todo (feriado
 * municipal) e desliga-lo fora de um horario (vespera de Natal so ate 12:00)
 * sao o mesmo conceito, por isso moram no mesmo cadastro. A union e
 * discriminada em vez de campos opcionais porque as duas formas aparecem
 * separadas na tela e porque este JSON e lido a olho na VM.
 */
export type DiaEspecial =
  | { data: string; tipo: "bloqueado"; motivo: string }
  | {
      data: string;
      tipo: "janela";
      inicio: string;
      fim: string;
      motivo: string;
      /**
       * Nomes de quem participa desta escala - o resto do time fica fora do
       * revezamento o dia inteiro, nao so fora da janela. Ausente (ou lista
       * vazia) significa "todo o time participa", o comportamento de antes
       * desta opcao existir - cadastros antigos nao tem este campo.
       */
      escalados?: string[];
    };

/**
 * Ferias de um atendente, com `fim` inclusivo - o retorno e no dia seguinte.
 *
 * Ferias e intervalo avaliado na hora, nao flag que alguem vira: nao existe
 * rotina pra "comecar" e "encerrar", o rodizio so pergunta se a pessoa esta de
 * ferias hoje. Sem estado pra dessincronizar.
 */
export interface Ferias {
  id: string;
  atendente: string;
  /** YYYY-MM-DD */
  inicio: string;
  /** YYYY-MM-DD */
  fim: string;
  observacao?: string;
}
