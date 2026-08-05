import fs from "node:fs";
import path from "node:path";
import { config } from "./config";
import { listarAtendentes, reativarAutomaticamente, type Atendente } from "./atendentes";
import { lerDiasEspeciais, lerFerias } from "./agenda/armazenamento";
import { estaDeFerias, estaEscaladoHoje } from "./agenda/regras";
import { diaEmSaoPaulo } from "./relatorios/periodos";

interface RotationState {
  ultimoAtendente: string | null;
}

function lerEstado(): RotationState {
  try {
    const raw = fs.readFileSync(config.stateFile, "utf-8");
    return JSON.parse(raw) as RotationState;
  } catch {
    return { ultimoAtendente: null };
  }
}

function salvarEstado(estado: RotationState): void {
  fs.mkdirSync(path.dirname(config.stateFile), { recursive: true });
  fs.writeFileSync(config.stateFile, JSON.stringify(estado, null, 2));
}

/**
 * Quem pode receber chamado hoje: precisa estar ativo (nao teve falta nem
 * afastamento marcado na mao), nao estar de ferias, e - num dia de escala
 * reduzida (ver Agenda) - estar na lista de quem participa.
 *
 * Sao coisas separadas de proposito. O `ativo` e o imprevisto de hoje; ferias
 * e intervalo agendado com antecedencia; escala e um plantao definido pra um
 * dia especifico. Nenhuma exige lembrar de desfazer depois - todas avaliam o
 * dia de hoje na hora, sem estado pra dessincronizar.
 */
function disponiveisHoje(todos: Atendente[]): (a: Atendente) => boolean {
  const hoje = diaEmSaoPaulo();
  const ferias = lerFerias();
  const especiais = lerDiasEspeciais();
  return (a) => a.ativo && !estaDeFerias(a.nome, hoje, ferias) && estaEscaladoHoje(a.nome, hoje, especiais);
}

/**
 * Espia quem e o proximo atendente disponivel da fila, sem avancar o rodizio.
 * A ordem fixa e a ordem de cadastro em state/atendentes.json; quem esta
 * indisponivel e pulado, mas mantem seu lugar na ordem - assim ninguem volta
 * de ferias tendo perdido a vez.
 */
export function atendenteAtual(): string {
  reativarAutomaticamente();

  const todos = listarAtendentes();
  const disponivel = disponiveisHoje(todos);
  const ativos = todos.filter(disponivel);
  if (ativos.length === 0) {
    throw new Error("Nenhum atendente disponivel no rodizio (todos afastados, de ferias ou fora da escala de hoje).");
  }

  const estado = lerEstado();
  const indiceUltimo = estado.ultimoAtendente ? todos.findIndex((a) => a.nome === estado.ultimoAtendente) : -1;

  for (let passo = 1; passo <= todos.length; passo++) {
    const candidato = todos[(indiceUltimo + passo) % todos.length];
    if (disponivel(candidato)) return candidato.nome;
  }

  return ativos[0].nome;
}

/**
 * Simula os proximos n passos do rodizio sem avancar o ponteiro real.
 * Usado pela tela "Fila ao vivo" para prever quem receberia cada chamado.
 * Retorna lista vazia se ninguem estiver disponivel.
 */
export function proximosNAtendentes(n: number): string[] {
  if (n <= 0) return [];
  reativarAutomaticamente();

  const todos = listarAtendentes();
  const disponivel = disponiveisHoje(todos);
  if (todos.filter(disponivel).length === 0) return [];

  const estado = lerEstado();
  let indiceUltimo = estado.ultimoAtendente ? todos.findIndex((a) => a.nome === estado.ultimoAtendente) : -1;

  const resultado: string[] = [];
  for (let i = 0; i < n; i++) {
    let encontrado = false;
    for (let passo = 1; passo <= todos.length; passo++) {
      const candidato = todos[(indiceUltimo + passo) % todos.length];
      if (disponivel(candidato)) {
        resultado.push(candidato.nome);
        indiceUltimo = (indiceUltimo + passo) % todos.length;
        encontrado = true;
        break;
      }
    }
    if (!encontrado) break;
  }
  return resultado;
}

/**
 * Avanca o rodizio (persistido em disco). So deve ser chamado depois que a
 * atribuicao do chamado foi confirmada com sucesso - caso contrario o
 * ponteiro fica fora de sincronia com quem realmente recebeu o chamado.
 */
export function avancarRodizio(nomeAtribuido: string): void {
  salvarEstado({ ultimoAtendente: nomeAtribuido });
}

/**
 * Ajuste manual do rodizio: forca quem sera o proximo atendente, sem
 * precisar que alguem receba um chamado de verdade primeiro. Funciona
 * ajustando ultimoAtendente para quem vem logo antes de "nome" na ordem
 * cadastrada, de forma que atendenteAtual() passe a retornar "nome".
 */
export function definirProximoManualmente(nome: string): void {
  const todos = listarAtendentes();
  const indiceAlvo = todos.findIndex((a) => a.nome === nome);

  if (indiceAlvo === -1) {
    throw new Error(`Atendente "${nome}" nao encontrado.`);
  }
  // Tres mensagens em vez de uma "indisponivel": o conserto e diferente em
  // cada caso - reativar na tela de equipe, apagar as ferias na Agenda, ou
  // ajustar a escala do dia.
  if (!todos[indiceAlvo].ativo) {
    throw new Error(`Atendente "${nome}" esta inativo e nao pode ser o proximo do rodizio.`);
  }
  const hoje = diaEmSaoPaulo();
  if (estaDeFerias(nome, hoje, lerFerias())) {
    throw new Error(`Atendente "${nome}" esta de ferias e nao pode ser o proximo do rodizio.`);
  }
  if (!estaEscaladoHoje(nome, hoje, lerDiasEspeciais())) {
    throw new Error(`Atendente "${nome}" nao esta na escala de hoje e nao pode ser o proximo do rodizio.`);
  }

  const indicePredecessor = (indiceAlvo - 1 + todos.length) % todos.length;
  salvarEstado({ ultimoAtendente: todos[indicePredecessor].nome });
}
