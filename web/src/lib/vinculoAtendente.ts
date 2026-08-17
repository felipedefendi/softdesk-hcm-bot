import type { Atendente } from "../api/tipos";

export function atendenteVinculado(atendentes: Atendente[] | null, codigo: number | null): Atendente | undefined {
  if (codigo === null) return undefined;
  return atendentes?.find((a) => a.codigoAtendente === codigo);
}

export function nomeDoVinculo(atendentes: Atendente[] | null, codigo: number | null): string {
  if (codigo === null) return "—";
  if (atendentes === null) return `#${codigo}`;
  return atendenteVinculado(atendentes, codigo)?.nome ?? `#${codigo} (fora do rodízio)`;
}

export function rotuloDaAcaoDeVinculo(atendentes: Atendente[] | null, codigo: number | null): string {
  if (atendentes === null) return "Editar vínculo";
  if (codigo === null) return "Vincular atendente";
  const atendente = atendenteVinculado(atendentes, codigo);
  if (!atendente) return "Recolocar no rodízio";
  if (!atendente.ativo) return "Reativar no rodízio";
  return "Alterar vínculo";
}
