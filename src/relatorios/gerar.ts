/**
 * Monta os dados dos relatorios: abre sessao, consulta a pesquisa do SoftDesk e
 * passa por metricas.ts. Nao formata nada e nao envia nada - quem desenha o card
 * e o cardTeams.ts, quem dispara e o rodar-relatorio.ts.
 *
 * Na sexta saem os dois relatorios (diario e semanal) numa **unica sessao**, pra
 * nao logar duas vezes no SoftDesk na mesma execucao.
 */
import { abrirSessao, encerrarSessao, type Sessao } from "../sessao";
import { contarChamados, listarTodos, type FiltroPesquisa } from "../pesquisa";
import {
  diaDaSemana,
  diaEmSaoPaulo,
  diasUteisAnteriores,
  horaEmSaoPaulo,
  mesAnteriorFechado,
  semanaSegASexta,
  somarDias,
  type DiaCivil,
} from "./periodos";
import {
  concentracaoTopClientes,
  faixaDePico,
  media,
  porCurvaAbc,
  porPrioridade,
  porStatus,
  topClientes,
  variacaoPercentual,
  type Contagem,
  type ContagemComPercentual,
} from "./metricas";
import { resumirErro } from "./erros";

/** Quantos dias uteis anteriores entram na media de comparacao do diario. */
const DIAS_DE_COMPARACAO = 5;
/** Quantos clientes aparecem no bloco de concentracao do semanal. */
const CLIENTES_NO_TOPO = 3;
/** No mensal a amostra e bem maior, entao cabe um top mais largo. */
const CLIENTES_NO_TOPO_MENSAL = 5;
const SEXTA = 5;
const PRIMEIRO_DIA_DO_MES = 1;

const TENTATIVAS = 3;
const ESPERA_ENTRE_TENTATIVAS_MS = 30_000;

export interface RelatorioDiario {
  dia: DiaCivil;
  /** Hora local do fechamento da janela, ex.: "17:45". */
  ate: string;
  total: number;
  mediaAnterior: number;
  /** Variacao contra a media dos dias anteriores. Null quando a media foi zero. */
  variacao: number | null;
  status: Contagem[];
  pico: Contagem | null;
}

export interface RelatorioSemanal {
  inicio: DiaCivil;
  fim: DiaCivil;
  total: number;
  totalAnterior: number;
  variacao: number | null;
  clientes: ContagemComPercentual[];
  curvaAbc: Contagem[];
  prioridades: Contagem[];
}

export interface RelatorioMensal {
  /** Primeiro dia do mes reportado - so ano e mes importam pro rotulo. */
  mes: DiaCivil;
  total: number;
  totalAnterior: number;
  variacao: number | null;
  clientes: ContagemComPercentual[];
  /** Quanto do volume os clientes do topo concentram, em percentual. */
  concentracao: number;
  curvaAbc: Contagem[];
}

export interface Relatorios {
  diario: RelatorioDiario;
  /** Null nos dias que nao sao sexta. */
  semanal: RelatorioSemanal | null;
  /** Null nos dias que nao sao o primeiro do mes. */
  mensal: RelatorioMensal | null;
}

const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Repete a operacao antes de desistir. O SoftDesk cai de vez em quando e uma
 * instabilidade de segundos nao deveria custar o relatorio do dia.
 */
export async function comRetentativa<T>(
  operacao: () => Promise<T>,
  tentativas = TENTATIVAS,
  esperaMs = ESPERA_ENTRE_TENTATIVAS_MS
): Promise<T> {
  let ultimoErro: unknown;

  for (let tentativa = 1; tentativa <= tentativas; tentativa++) {
    try {
      return await operacao();
    } catch (err) {
      ultimoErro = err;
      console.error(`[relatorio] tentativa ${tentativa}/${tentativas} falhou: ${resumirErro(err)}`);
      if (tentativa < tentativas) await espera(esperaMs);
    }
  }

  throw ultimoErro;
}

/**
 * Dia corrente ate o momento da execucao. Com o timer as 17:45, chamados
 * abertos depois disso entram no relatorio do dia seguinte - por isso o card
 * informa a hora de corte.
 */
async function coletarDiario(sessao: Sessao, agora: Date): Promise<RelatorioDiario> {
  const dia = diaEmSaoPaulo(agora);
  const chamados = await listarTodos(sessao, { inicio: dia, fim: dia });

  // Os dias anteriores viram so um numero, entao contamos sem baixar registro.
  const anteriores: number[] = [];
  for (const anterior of diasUteisAnteriores(dia, DIAS_DE_COMPARACAO)) {
    anteriores.push(await contarChamados(sessao, { inicio: anterior, fim: anterior }));
  }

  const mediaAnterior = media(anteriores);

  return {
    dia,
    ate: horaEmSaoPaulo(agora),
    total: chamados.length,
    mediaAnterior,
    variacao: variacaoPercentual(chamados.length, mediaAnterior),
    status: porStatus(chamados),
    pico: faixaDePico(chamados),
  };
}

/** Semana de segunda a sexta que contem `dia`, comparada com a semana anterior. */
async function coletarSemanal(sessao: Sessao, dia: DiaCivil): Promise<RelatorioSemanal> {
  const semana = semanaSegASexta(dia);
  const chamados = await listarTodos(sessao, semana);

  const anterior: FiltroPesquisa = {
    inicio: somarDias(semana.inicio, -7),
    fim: somarDias(semana.fim, -7),
  };
  const totalAnterior = await contarChamados(sessao, anterior);

  return {
    inicio: semana.inicio,
    fim: semana.fim,
    total: chamados.length,
    totalAnterior,
    variacao: variacaoPercentual(chamados.length, totalAnterior),
    clientes: topClientes(chamados, CLIENTES_NO_TOPO),
    curvaAbc: porCurvaAbc(chamados),
    prioridades: porPrioridade(chamados),
  };
}

/**
 * Mes anterior fechado, comparado com o mes antes dele. Roda no dia 1, quando o
 * mes reportado ja terminou - nunca compara mes parcial com mes inteiro.
 */
async function coletarMensal(sessao: Sessao, dia: DiaCivil): Promise<RelatorioMensal> {
  const mes = mesAnteriorFechado(dia);
  const chamados = await listarTodos(sessao, mes);

  const totalAnterior = await contarChamados(sessao, mesAnteriorFechado(mes.inicio));

  return {
    mes: mes.inicio,
    total: chamados.length,
    totalAnterior,
    variacao: variacaoPercentual(chamados.length, totalAnterior),
    clientes: topClientes(chamados, CLIENTES_NO_TOPO_MENSAL),
    concentracao: concentracaoTopClientes(chamados, CLIENTES_NO_TOPO_MENSAL),
    curvaAbc: porCurvaAbc(chamados),
  };
}

export interface ForcarCadencias {
  semanal?: boolean;
  mensal?: boolean;
}

/**
 * Coleta o que a data pede: diario todo dia util, semanal tambem na sexta e
 * mensal tambem no dia 1. Os `forcar` existem pra conferir os cards fora da
 * data certa, sem esperar a semana ou o mes virar.
 */
export async function gerarRelatorios(
  agora: Date = new Date(),
  forcar: ForcarCadencias = {}
): Promise<Relatorios> {
  const sessao = await abrirSessao();

  try {
    const diario = await coletarDiario(sessao, agora);
    const dia = diaEmSaoPaulo(agora);
    const ehSexta = diaDaSemana(dia) === SEXTA;
    const ehDiaUm = dia.dia === PRIMEIRO_DIA_DO_MES;

    return {
      diario,
      semanal: ehSexta || forcar.semanal ? await coletarSemanal(sessao, dia) : null,
      mensal: ehDiaUm || forcar.mensal ? await coletarMensal(sessao, dia) : null,
    };
  } finally {
    await encerrarSessao(sessao);
  }
}
