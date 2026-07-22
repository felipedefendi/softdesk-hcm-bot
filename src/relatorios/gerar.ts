/**
 * Monta os dados de cada relatorio: abre sessao, consulta a pesquisa do SoftDesk
 * e passa por metricas.ts. Nao formata nada e nao envia nada - quem desenha o
 * card e o cardTeams.ts, quem dispara e o rodar-relatorio.ts.
 */
import { abrirSessao, encerrarSessao } from "../sessao";
import { contarChamados, listarTodos, type FiltroPesquisa } from "../pesquisa";
import { diaEmSaoPaulo, diasUteisAnteriores, horaEmSaoPaulo, type DiaCivil } from "./periodos";
import { faixaDePico, media, porStatus, variacaoPercentual, type Contagem } from "./metricas";
import { resumirErro } from "./erros";

/** Quantos dias uteis anteriores entram na media de comparacao do diario. */
const DIAS_DE_COMPARACAO = 5;

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
 * Relatorio do dia corrente ate o momento da execucao. A janela e sempre
 * "00:00 ate agora" - com o timer as 17:45, chamados abertos depois disso
 * entram no relatorio do dia seguinte, por isso o card informa a hora de corte.
 */
export async function gerarRelatorioDiario(agora: Date = new Date()): Promise<RelatorioDiario> {
  const dia = diaEmSaoPaulo(agora);
  const sessao = await abrirSessao();

  try {
    const doDia: FiltroPesquisa = { inicio: dia, fim: dia };
    const chamados = await listarTodos(sessao, doDia);

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
  } finally {
    await encerrarSessao(sessao);
  }
}
