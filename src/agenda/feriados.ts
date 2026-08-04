/**
 * Feriados nacionais de um ano, pra alimentar o botao "preencher feriados" da
 * Agenda. Funcoes puras: nao leem nem gravam nada.
 *
 * O botao propoe, nao grava direto. Metade do Carnaval e politica de empresa,
 * nao lei - o codigo nao tem como saber se voces trabalham na segunda-feira,
 * entao a lista chega com essas datas desmarcadas.
 */
import { deISO, ehDiaUtil, formatarISO, somarDias, type DiaCivil } from "../relatorios/periodos";
import type { DiaEspecial } from "./tipos";

export interface FeriadoSugerido {
  dia: DiaEspecial;
  /**
   * Chega marcado na tela? Vem marcado o que praticamente toda empresa para
   * (os feriados de lei e a terca de Carnaval) e desmarcado o que varia de
   * lugar pra lugar - segunda de Carnaval, Quarta-feira de Cinzas e Corpus
   * Christi. Nao e a distincao juridica entre feriado e ponto facultativo:
   * e so o palpite razoavel de qual vale marcar sozinho.
   */
  marcadoPorPadrao: boolean;
}

/** Feriados nacionais de data fixa, como [mes, dia, nome]. */
const FIXOS: [number, number, string][] = [
  [1, 1, "Confraternização Universal"],
  [4, 21, "Tiradentes"],
  [5, 1, "Dia do Trabalho"],
  [9, 7, "Independência do Brasil"],
  [10, 12, "Nossa Senhora Aparecida"],
  [11, 2, "Finados"],
  [11, 15, "Proclamação da República"],
  [11, 20, "Consciência Negra"],
  [12, 25, "Natal"],
];

/**
 * Domingo de Pascoa do ano, pelo algoritmo de Meeus/Butcher (calendario
 * gregoriano). Todas as divisoes sao inteiras - dai os Math.floor.
 *
 * Dele saem os feriados moveis brasileiros. Nao ha tabela pra manter: o botao
 * continua acertando em 2040 sem ninguem tocar no codigo.
 */
export function domingoDePascoa(ano: number): DiaCivil {
  const a = ano % 19;
  const b = Math.floor(ano / 100);
  const c = ano % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);

  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return { ano, mes, dia };
}

/**
 * Os feriados nacionais do ano, ja no formato de cadastro.
 *
 * Quem cai em sabado ou domingo fica de fora: o timer do bot so roda de segunda
 * a sexta, entao bloquear um sabado nao desliga nada - so daria trabalho de
 * conferir na tela. Os moveis nunca sao filtrados, porque derivam da Pascoa e
 * caem sempre no mesmo dia da semana.
 */
export function feriadosDoAno(ano: number): FeriadoSugerido[] {
  const pascoa = domingoDePascoa(ano);
  const bloqueio = (d: DiaCivil, motivo: string): DiaEspecial => ({ data: formatarISO(d), tipo: "bloqueado", motivo });

  const sugestoes: FeriadoSugerido[] = [
    ...FIXOS.map(([mes, dia, motivo]) => ({
      dia: bloqueio({ ano, mes, dia }, motivo),
      marcadoPorPadrao: true,
    })),
    { dia: bloqueio(somarDias(pascoa, -48), "Segunda-feira de Carnaval"), marcadoPorPadrao: false },
    { dia: bloqueio(somarDias(pascoa, -47), "Carnaval"), marcadoPorPadrao: true },
    {
      // O unico movel que nao e bloqueio: o expediente costuma comecar ao
      // meio-dia. O fim tem que passar de 18:55, que e o ultimo disparo do
      // softdesk-bot.timer - senao a sugestao encurtaria a tarde sem querer.
      dia: {
        data: formatarISO(somarDias(pascoa, -46)),
        tipo: "janela",
        inicio: "12:00",
        fim: "19:00",
        motivo: "Quarta-feira de Cinzas",
      },
      marcadoPorPadrao: false,
    },
    { dia: bloqueio(somarDias(pascoa, -2), "Sexta-feira Santa"), marcadoPorPadrao: true },
    { dia: bloqueio(somarDias(pascoa, 60), "Corpus Christi"), marcadoPorPadrao: false },
  ];

  return sugestoes.filter((s) => ehDiaUtil(deISO(s.dia.data))).sort((x, y) => x.dia.data.localeCompare(y.dia.data));
}
