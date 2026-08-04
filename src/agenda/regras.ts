/**
 * As decisoes da Agenda, todas puras: recebem o dia/hora e os cadastros por
 * parametro e nao tocam em disco. Quem le os arquivos e chama isto e a camada
 * de armazenamento.
 *
 * Comparacao de data e hora e feita direto nas strings: "YYYY-MM-DD" e "HH:MM"
 * com zero a esquerda ordenam igual em texto e em valor, entao nao ha conversao
 * nenhuma no caminho quente (o bot roda a cada 5 minutos).
 */
import { ehDiaUtil, formatarISO, somarDias, deISO, type DiaCivil } from "../relatorios/periodos";
import type { DiaEspecial, Ferias } from "./tipos";

export type EstadoDoDia =
  | { rodizio: "liberado" }
  | { rodizio: "bloqueado"; motivo: string }
  | { rodizio: "fora-da-janela"; inicio: string; fim: string; motivo: string };

/** Teto de seguranca da varredura de intervalos, no mesmo espirito de periodos.ts. */
const MAXIMO_DE_DIAS_VARRIDOS = 400;

/**
 * O revezamento pode encaminhar agora?
 *
 * `agora` entra por parametro de proposito: sem isso nao da pra testar a borda
 * da janela, que e justamente onde mora o comportamento que o Felipe pediu.
 */
export function estadoDoDia(hoje: DiaCivil, agora: string, especiais: DiaEspecial[]): EstadoDoDia {
  const especial = especiais.find((e) => e.data === formatarISO(hoje));
  if (!especial) return { rodizio: "liberado" };
  if (especial.tipo === "bloqueado") return { rodizio: "bloqueado", motivo: especial.motivo };

  // O fim e exclusivo: "so trabalha ate 12:00" quer dizer que a passada das
  // 12:00 em ponto ja nao encaminha ninguem.
  if (agora >= especial.inicio && agora < especial.fim) return { rodizio: "liberado" };

  return { rodizio: "fora-da-janela", inicio: especial.inicio, fim: especial.fim, motivo: especial.motivo };
}

/**
 * O motivo do bloqueio de dia inteiro, ou null se o dia nao esta bloqueado.
 *
 * Separado do `estadoDoDia` porque quem pergunta isto nao tem hora: o relatorio
 * quer saber se o dia inteiro caiu, nao se o revezamento esta parado agora. Num
 * dia de janela reduzida o relatorio das 17:45 sai normalmente, mesmo com o
 * revezamento ja encerrado - os numeros do dia continuam valendo.
 */
export function motivoDoBloqueio(dia: DiaCivil, especiais: DiaEspecial[]): string | null {
  const especial = especiais.find((e) => e.data === formatarISO(dia));
  return especial?.tipo === "bloqueado" ? especial.motivo : null;
}

/** O atendente esta de ferias neste dia? `fim` e inclusivo. */
export function estaDeFerias(atendente: string, dia: DiaCivil, ferias: Ferias[]): boolean {
  const iso = formatarISO(dia);
  return ferias.some((f) => f.atendente === atendente && f.inicio <= iso && iso <= f.fim);
}

/**
 * O atendente participa do revezamento neste dia?
 *
 * So um dia de janela com `escalados` definido restringe alguem - nos demais
 * casos (dia normal, dia bloqueado, janela sem escala) todo mundo participa,
 * o bloqueado global ja e tratado em outro lugar (estadoDoDia). Quem nao esta
 * escalado fica fora o dia inteiro, nao so fora da janela: e um plantao
 * reduzido, nao uma equipe inteira trabalhando menos horas.
 */
export function estaEscaladoHoje(atendente: string, dia: DiaCivil, especiais: DiaEspecial[]): boolean {
  const especial = especiais.find((e) => e.data === formatarISO(dia));
  if (especial?.tipo !== "janela" || !especial.escalados || especial.escalados.length === 0) return true;
  return especial.escalados.includes(atendente);
}

/**
 * Os dias do intervalo em que nenhum atendente sobraria no rodizio.
 *
 * Serve de aviso na hora de cadastrar ferias, nao de trava: deixar a equipe
 * inteira fora pode ser proposital (recesso), e barrar o cadastro seria o
 * sistema achando que sabe mais que a pessoa. Sem isso, so se descobre no dia,
 * pelo bot vermelho - `atendenteAtual()` lanca quando nao sobra ninguem.
 *
 * Fim de semana e dia bloqueado ficam de fora porque o bot nao roda neles: um
 * aviso que aponta o feriado municipal e um aviso que se aprende a ignorar.
 */
export function diasSemAtendenteDisponivel(
  intervalo: { inicio: string; fim: string },
  atendentesAtivos: string[],
  ferias: Ferias[],
  especiais: DiaEspecial[]
): string[] {
  if (atendentesAtivos.length === 0) return [];

  const bloqueados = new Set(especiais.filter((e) => e.tipo === "bloqueado").map((e) => e.data));
  const vazios: string[] = [];
  let atual = deISO(intervalo.inicio);

  for (let passo = 0; passo < MAXIMO_DE_DIAS_VARRIDOS; passo++) {
    const iso = formatarISO(atual);
    if (iso > intervalo.fim) break;

    if (ehDiaUtil(atual) && !bloqueados.has(iso)) {
      const sobrou = atendentesAtivos.some((nome) => !estaDeFerias(nome, atual, ferias));
      if (!sobrou) vazios.push(iso);
    }

    atual = somarDias(atual, 1);
  }

  return vazios;
}

/** Erro de cadastro em texto, ou null se estiver tudo certo. */
export function validarFerias(nova: Ferias, existentes: Ferias[], nomesCadastrados: string[]): string | null {
  if (!nomesCadastrados.includes(nova.atendente)) {
    return `Atendente "${nova.atendente}" nao esta cadastrado.`;
  }
  if (!dataValida(nova.inicio) || !dataValida(nova.fim)) {
    return "Datas precisam estar no formato AAAA-MM-DD e existir no calendario.";
  }
  if (nova.inicio > nova.fim) {
    return "A data de inicio nao pode ser depois da data de fim.";
  }

  // Ignora o proprio registro pra que editar uma ferias existente nao colida
  // consigo mesma.
  const conflito = existentes.find(
    (f) => f.id !== nova.id && f.atendente === nova.atendente && f.inicio <= nova.fim && nova.inicio <= f.fim
  );
  if (conflito) {
    return `Ja existe ferias de ${nova.atendente} entre ${conflito.inicio} e ${conflito.fim}.`;
  }

  return null;
}

/**
 * Erro de cadastro em texto, ou null se estiver tudo certo. `nomesCadastrados`
 * so importa quando ha `escalados` - opcional pra nao quebrar quem chama sem
 * essa lista em mao (ex.: o botao de feriados nunca manda escalados).
 */
export function validarDiaEspecial(dia: DiaEspecial, nomesCadastrados?: string[]): string | null {
  if (!dataValida(dia.data)) {
    return "Data precisa estar no formato AAAA-MM-DD e existir no calendario.";
  }
  if (!dia.motivo.trim()) {
    return "Informe o motivo - e o que aparece na tela e no aviso da Visao geral.";
  }
  if (dia.tipo === "janela") {
    if (!horaValida(dia.inicio) || !horaValida(dia.fim)) {
      return "Horarios precisam estar no formato HH:MM.";
    }
    if (dia.inicio >= dia.fim) {
      return "O horario de inicio precisa ser antes do de fim.";
    }
    if (dia.escalados) {
      if (dia.escalados.length === 0) {
        return "Selecione ao menos um atendente para a escala, ou desmarque a opcao pra deixar o time inteiro.";
      }
      const desconhecido = nomesCadastrados && dia.escalados.find((nome) => !nomesCadastrados.includes(nome));
      if (desconhecido) {
        return `Atendente "${desconhecido}" nao esta cadastrado.`;
      }
    }
  }
  return null;
}

/**
 * Data existe de verdade? O `<input type="date">` da tela nao produz 31/02, mas
 * a rota aceita qualquer JSON - e uma data impossivel nao daria erro nenhum,
 * so ficaria no arquivo sem nunca casar com dia nenhum.
 *
 * `somarDias(d, 0)` normaliza pelo Date (31/02 vira 03/03); se o texto deixou
 * de bater, a data nao existia.
 */
function dataValida(texto: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)) return false;
  return formatarISO(somarDias(deISO(texto), 0)) === texto;
}

function horaValida(texto: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(texto);
}
