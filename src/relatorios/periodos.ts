/**
 * Funcoes puras de data para os relatorios, sempre no fuso America/Sao_Paulo.
 * A VM de producao (Oracle Cloud) pode estar em UTC, entao nunca confiar no fuso
 * do sistema - o dia civil e sempre calculado explicitamente aqui.
 *
 * A aritmetica usa Date.UTC de proposito: datas civis nao tem horario, e operar
 * em UTC evita que horario de verao mude a conta de "somar um dia".
 */

const FUSO = "America/Sao_Paulo";
const UM_DIA_MS = 24 * 60 * 60 * 1000;

/** Uma data sem horario. `mes` e 1-12 (nao 0-11 como no Date). */
export interface DiaCivil {
  ano: number;
  mes: number;
  dia: number;
}

export interface Intervalo {
  inicio: DiaCivil;
  fim: DiaCivil;
}

const formatadorDia = new Intl.DateTimeFormat("en-CA", {
  timeZone: FUSO,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const formatadorHora = new Intl.DateTimeFormat("pt-BR", {
  timeZone: FUSO,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/** O dia civil em Sao Paulo no momento informado (padrao: agora). */
export function diaEmSaoPaulo(momento: Date = new Date()): DiaCivil {
  const [ano, mes, dia] = formatadorDia.format(momento).split("-").map(Number);
  return { ano, mes, dia };
}

/** Hora local de Sao Paulo no formato "HH:MM". */
export function horaEmSaoPaulo(momento: Date = new Date()): string {
  return formatadorHora.format(momento);
}

function paraUTC(d: DiaCivil): number {
  return Date.UTC(d.ano, d.mes - 1, d.dia);
}

function deUTC(ms: number): DiaCivil {
  const d = new Date(ms);
  return { ano: d.getUTCFullYear(), mes: d.getUTCMonth() + 1, dia: d.getUTCDate() };
}

export function somarDias(d: DiaCivil, quantidade: number): DiaCivil {
  return deUTC(paraUTC(d) + quantidade * UM_DIA_MS);
}

/** 0 = domingo, 1 = segunda, ..., 6 = sabado. */
export function diaDaSemana(d: DiaCivil): number {
  return new Date(paraUTC(d)).getUTCDay();
}

export function ehDiaUtil(d: DiaCivil): boolean {
  const s = diaDaSemana(d);
  return s >= 1 && s <= 5;
}

/** Formato exigido pelo filtro de periodo da pesquisa do SoftDesk. */
export function formatarBR(d: DiaCivil): string {
  const dd = String(d.dia).padStart(2, "0");
  const mm = String(d.mes).padStart(2, "0");
  return `${dd}/${mm}/${d.ano}`;
}

/** Formato do campo `da_chamado` na resposta da pesquisa. */
export function formatarISO(d: DiaCivil): string {
  const mm = String(d.mes).padStart(2, "0");
  const dd = String(d.dia).padStart(2, "0");
  return `${d.ano}-${mm}-${dd}`;
}

export function deISO(texto: string): DiaCivil {
  const [ano, mes, dia] = texto.split("-").map(Number);
  return { ano, mes, dia };
}

/**
 * Os N dias uteis imediatamente anteriores a `d` (nao inclui `d`).
 * Usado na comparacao do relatorio diario contra a media recente.
 */
export function diasUteisAnteriores(d: DiaCivil, quantidade: number): DiaCivil[] {
  const dias: DiaCivil[] = [];
  let atual = d;

  while (dias.length < quantidade) {
    atual = somarDias(atual, -1);
    if (ehDiaUtil(atual)) dias.push(atual);
  }
  return dias;
}

/**
 * A semana de segunda a sexta que contem `d`. Sabado e domingo pertencem a
 * semana que acabou de terminar - o relatorio semanal roda na sexta, mas assim
 * uma execucao manual no fim de semana ainda reporta a semana certa.
 */
export function semanaSegASexta(d: DiaCivil): Intervalo {
  const s = diaDaSemana(d);
  const recuoAteSegunda = s === 0 ? 6 : s - 1;
  const inicio = somarDias(d, -recuoAteSegunda);
  return { inicio, fim: somarDias(inicio, 4) };
}

/** O mes anterior fechado (primeiro e ultimo dia), a partir de qualquer dia de `d`. */
export function mesAnteriorFechado(d: DiaCivil): Intervalo {
  const fim = somarDias({ ano: d.ano, mes: d.mes, dia: 1 }, -1);
  return { inicio: { ano: fim.ano, mes: fim.mes, dia: 1 }, fim };
}
