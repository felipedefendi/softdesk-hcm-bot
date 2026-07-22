/**
 * Agregacoes dos relatorios. Funcoes puras, sem IO e sem dependencia da API -
 * recebem chamados ja carregados e devolvem numeros prontos pro card.
 *
 * Regra do projeto: nenhuma metrica agrupa por atendente.
 */
import type { ChamadoPesquisa } from "../pesquisa";

export interface Contagem {
  rotulo: string;
  quantidade: number;
}

export interface ContagemComPercentual extends Contagem {
  /** Percentual do total, arredondado pra inteiro. */
  percentual: number;
}

export interface ContagemPrioridade extends Contagem {
  cor: string;
}

/** Da severidade maior pra menor - le melhor no card do que ordenar por volume. */
const ORDEM_PRIORIDADE = ["Crítica", "Alta", "Média", "Baixa"];

const SEM_VALOR = "(nao informado)";

function arredondar(valor: number, casas = 0): number {
  const fator = 10 ** casas;
  return Math.round(valor * fator) / fator;
}

/** Agrupa por uma chave textual. Empate desempata pelo rotulo, pra ordem estavel. */
function contarPor(chamados: ChamadoPesquisa[], chave: (c: ChamadoPesquisa) => string): Contagem[] {
  const mapa = new Map<string, number>();

  for (const chamado of chamados) {
    const rotulo = chave(chamado) || SEM_VALOR;
    mapa.set(rotulo, (mapa.get(rotulo) ?? 0) + 1);
  }

  return [...mapa.entries()]
    .map(([rotulo, quantidade]) => ({ rotulo, quantidade }))
    .sort((a, b) => b.quantidade - a.quantidade || a.rotulo.localeCompare(b.rotulo));
}

export function porStatus(chamados: ChamadoPesquisa[]): Contagem[] {
  return contarPor(chamados, (c) => c.status);
}

export function porCurvaAbc(chamados: ChamadoPesquisa[]): Contagem[] {
  return contarPor(chamados, (c) => c.curvaAbc ?? SEM_VALOR).sort((a, b) =>
    a.rotulo.localeCompare(b.rotulo)
  );
}

/** Mantem a cor nativa do SoftDesk pra colorir o card. */
export function porPrioridade(chamados: ChamadoPesquisa[]): ContagemPrioridade[] {
  const cores = new Map<string, string>();
  for (const c of chamados) {
    if (c.prioridade && !cores.has(c.prioridade)) cores.set(c.prioridade, c.corPrioridade);
  }

  return contarPor(chamados, (c) => c.prioridade)
    .map((item) => ({ ...item, cor: cores.get(item.rotulo) ?? "" }))
    .sort((a, b) => {
      const pa = ORDEM_PRIORIDADE.indexOf(a.rotulo);
      const pb = ORDEM_PRIORIDADE.indexOf(b.rotulo);
      // Prioridade desconhecida vai pro fim, nao pro comeco.
      return (pa === -1 ? 99 : pa) - (pb === -1 ? 99 : pb);
    });
}

/** Os `quantos` clientes com mais chamados, com o peso de cada um no total. */
export function topClientes(chamados: ChamadoPesquisa[], quantos: number): ContagemComPercentual[] {
  if (chamados.length === 0) return [];

  return contarPor(chamados, (c) => c.cliente)
    .slice(0, quantos)
    .map((item) => ({
      ...item,
      percentual: arredondar((item.quantidade / chamados.length) * 100),
    }));
}

/** Quanto do volume total os `quantos` maiores clientes concentram, em percentual. */
export function concentracaoTopClientes(chamados: ChamadoPesquisa[], quantos: number): number {
  if (chamados.length === 0) return 0;

  const soma = contarPor(chamados, (c) => c.cliente)
    .slice(0, quantos)
    .reduce((total, item) => total + item.quantidade, 0);

  return arredondar((soma / chamados.length) * 100);
}

/** Volume por faixa de hora ("08h", "09h", ...), em ordem cronologica. */
export function porFaixaHoraria(chamados: ChamadoPesquisa[]): Contagem[] {
  return contarPor(chamados, (c) => `${c.hora.slice(0, 2)}h`).sort((a, b) =>
    a.rotulo.localeCompare(b.rotulo)
  );
}

/** A faixa de hora com mais chamados, ou null se nao houver chamado. */
export function faixaDePico(chamados: ChamadoPesquisa[]): Contagem | null {
  const faixas = contarPor(chamados, (c) => `${c.hora.slice(0, 2)}h`);
  return faixas[0] ?? null;
}

/** Volume por dia de abertura ("YYYY-MM-DD"), em ordem cronologica. */
export function porDia(chamados: ChamadoPesquisa[]): Contagem[] {
  return contarPor(chamados, (c) => c.data).sort((a, b) => a.rotulo.localeCompare(b.rotulo));
}

/**
 * Variacao percentual de `anterior` para `atual`. Devolve null quando o periodo
 * anterior foi zero - nao existe "aumento percentual" a partir de zero, e mostrar
 * "+Infinity%" no card seria pior do que omitir a comparacao.
 */
export function variacaoPercentual(atual: number, anterior: number): number | null {
  if (anterior === 0) return null;
  return arredondar(((atual - anterior) / anterior) * 100);
}

/** Media aritmetica, com uma casa decimal. Lista vazia devolve 0. */
export function media(valores: number[]): number {
  if (valores.length === 0) return 0;
  return arredondar(valores.reduce((s, v) => s + v, 0) / valores.length, 1);
}
