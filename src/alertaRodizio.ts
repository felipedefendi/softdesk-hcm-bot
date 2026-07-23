/**
 * Deteccao de rodizio possivelmente travado.
 *
 * Existe por causa de uma escolha deliberada: nenhum relatorio agrupa chamados
 * por atendente, pra nao virar placar de produtividade. O efeito colateral e que
 * um ponteiro travado (ou alguem sendo pulado por defeito) deixaria de ser
 * percebido. Este alerta recupera o sinal tecnico sem criar ranking nenhum: nao
 * conta quantos chamados cada um recebeu, so ha quanto tempo nao recebe.
 *
 * Vive apenas no dashboard - nunca vai pro Teams.
 */
import { diasUteisEntre, type DiaCivil } from "./relatorios/periodos";

export interface EntradaDeLog {
  horario: string | null;
  atendente: string | null;
}

export interface AtendenteSemReceber {
  atendente: string;
  /** Dias uteis desde o ultimo chamado. `null` = nao aparece no historico. */
  diasUteis: number | null;
}

/** Le "15/07/2026, 11:42:11" (ou sem a virgula) - o formato que o log.ts grava. */
export function diaDaLinhaDeLog(horario: string | null): DiaCivil | null {
  const match = horario?.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (!match) return null;

  const [, dia, mes, ano] = match;
  return { ano: Number(ano), mes: Number(mes), dia: Number(dia) };
}

/** O dia do ultimo encaminhamento de cada atendente que aparece no log. */
function ultimoDiaPorAtendente(entradas: EntradaDeLog[]): Map<string, DiaCivil> {
  const ultimo = new Map<string, DiaCivil>();

  for (const entrada of entradas) {
    const dia = diaDaLinhaDeLog(entrada.horario);
    if (!entrada.atendente || !dia) continue;

    const anterior = ultimo.get(entrada.atendente);
    if (!anterior || Date.UTC(dia.ano, dia.mes - 1, dia.dia) > Date.UTC(anterior.ano, anterior.mes - 1, anterior.dia)) {
      ultimo.set(entrada.atendente, dia);
    }
  }

  return ultimo;
}

/**
 * Atendentes **ativos** que passaram do limite sem receber chamado. Quem nunca
 * aparece no historico entra com `diasUteis: null` - pode ser cadastro novo,
 * mas tambem e exatamente o sintoma de estar sendo pulado, entao quem le decide.
 *
 * Inativos ficam de fora de proposito: nao receber e o comportamento correto
 * pra quem esta de ferias ou afastado.
 */
export function detectarRodizioTravado(
  entradas: EntradaDeLog[],
  ativos: string[],
  hoje: DiaCivil,
  limiteDiasUteis: number
): AtendenteSemReceber[] {
  const ultimo = ultimoDiaPorAtendente(entradas);

  return ativos
    .map((atendente): AtendenteSemReceber => {
      const dia = ultimo.get(atendente);
      return { atendente, diasUteis: dia ? diasUteisEntre(dia, hoje) : null };
    })
    .filter((a) => a.diasUteis === null || a.diasUteis >= limiteDiasUteis)
    .sort((a, b) => (b.diasUteis ?? Infinity) - (a.diasUteis ?? Infinity));
}
