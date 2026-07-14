import fs from "node:fs";
import path from "node:path";
import { config } from "./config";
import { listarAtendentes, reativarAutomaticamente } from "./atendentes";

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
 * Espia quem e o proximo atendente ativo da fila, sem avancar o rodizio.
 * A ordem fixa e a ordem de cadastro em state/atendentes.json; atendentes
 * inativos (falta/ferias) sao pulados, mas mantem seu lugar na ordem.
 */
export function atendenteAtual(): string {
  reativarAutomaticamente();

  const todos = listarAtendentes();
  const ativos = todos.filter((a) => a.ativo);
  if (ativos.length === 0) {
    throw new Error("Nenhum atendente ativo no rodizio (todos afastados).");
  }

  const estado = lerEstado();
  const indiceUltimo = estado.ultimoAtendente ? todos.findIndex((a) => a.nome === estado.ultimoAtendente) : -1;

  for (let passo = 1; passo <= todos.length; passo++) {
    const candidato = todos[(indiceUltimo + passo) % todos.length];
    if (candidato.ativo) return candidato.nome;
  }

  return ativos[0].nome;
}

/**
 * Avanca o rodizio (persistido em disco). So deve ser chamado depois que a
 * atribuicao do chamado foi confirmada com sucesso - caso contrario o
 * ponteiro fica fora de sincronia com quem realmente recebeu o chamado.
 */
export function avancarRodizio(nomeAtribuido: string): void {
  salvarEstado({ ultimoAtendente: nomeAtribuido });
}
