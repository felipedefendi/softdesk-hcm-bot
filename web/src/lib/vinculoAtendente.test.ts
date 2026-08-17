import { describe, expect, it } from "vitest";
import { nomeDoVinculo, rotuloDaAcaoDeVinculo } from "./vinculoAtendente";
import type { Atendente } from "../api/tipos";

const ativos: Atendente[] = [
  { nome: "Ana", codigoAtendente: 10, ativo: true, motivoInatividade: null, retornaEm: null },
  { nome: "Bruno", codigoAtendente: 20, ativo: false, motivoInatividade: "Ausente", retornaEm: null },
];

describe("vinculo de usuario com atendente", () => {
  it("mostra quando o codigo preservado esta fora do rodizio", () => {
    expect(nomeDoVinculo(ativos, 30)).toBe("#30 (fora do rodízio)");
    expect(rotuloDaAcaoDeVinculo(ativos, 30)).toBe("Recolocar no rodízio");
  });

  it("diferencia vinculo ausente, ativo e inativo", () => {
    expect(rotuloDaAcaoDeVinculo(ativos, null)).toBe("Vincular atendente");
    expect(rotuloDaAcaoDeVinculo(ativos, 10)).toBe("Alterar vínculo");
    expect(rotuloDaAcaoDeVinculo(ativos, 20)).toBe("Reativar no rodízio");
  });

  it("nao acusa remocao enquanto os atendentes ainda estao carregando", () => {
    expect(nomeDoVinculo(null, 30)).toBe("#30");
    expect(rotuloDaAcaoDeVinculo(null, 30)).toBe("Editar vínculo");
  });
});
