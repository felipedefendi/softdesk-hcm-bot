import { test, expect } from "vitest";
import { agruparCredenciais } from "./agruparCredenciais";
import type { CredencialMetadados } from "../api/tipos";

const HOJE = "2026-07-27";
const NOMES_SISTEMA: Record<string, string> = { g5: "G5 (On-Premise)", cloud: "Cloud - Antares" };
const nomeSistema = (id: string) => NOMES_SISTEMA[id] ?? id;

function credencial(parcial: Partial<CredencialMetadados>): CredencialMetadados {
  return {
    id: "id",
    cliente: "Cliente X",
    sistemaId: "g5",
    link: null,
    validade: null,
    arquivado: false,
    criadoEm: "2026-01-01T00:00:00.000Z",
    atualizadoEm: "2026-01-01T00:00:00.000Z",
    ...parcial,
  };
}

test("agrupa por cliente", () => {
  const credenciais = [
    credencial({ id: "1", cliente: "Boa Compra" }),
    credencial({ id: "2", cliente: "Outra Empresa" }),
    credencial({ id: "3", cliente: "Boa Compra" }),
  ];
  const grupos = agruparCredenciais(credenciais, "", HOJE, nomeSistema);
  expect(grupos.map((g) => g.cliente).sort()).toEqual(["Boa Compra", "Outra Empresa"]);
  expect(grupos.find((g) => g.cliente === "Boa Compra")?.credenciais).toHaveLength(2);
});

test("grupos com credencial vencida vem antes dos demais", () => {
  const credenciais = [
    credencial({ id: "1", cliente: "Em dia", validade: "2026-12-01" }),
    credencial({ id: "2", cliente: "Vencido", validade: "2026-07-01" }),
  ];
  const grupos = agruparCredenciais(credenciais, "", HOJE, nomeSistema);
  expect(grupos.map((g) => g.cliente)).toEqual(["Vencido", "Em dia"]);
});

test("dentro do grupo, a credencial mais urgente fica primeiro", () => {
  const credenciais = [
    credencial({ id: "1", cliente: "Cliente X", validade: "2026-12-01" }),
    credencial({ id: "2", cliente: "Cliente X", validade: "2026-08-01" }),
  ];
  const grupos = agruparCredenciais(credenciais, "", HOJE, nomeSistema);
  expect(grupos[0].credenciais.map((c) => c.id)).toEqual(["2", "1"]);
});

test("grupos empatados em urgencia ficam em ordem alfabetica", () => {
  const credenciais = [credencial({ id: "1", cliente: "Zeta" }), credencial({ id: "2", cliente: "Alfa" })];
  const grupos = agruparCredenciais(credenciais, "", HOJE, nomeSistema);
  expect(grupos.map((g) => g.cliente)).toEqual(["Alfa", "Zeta"]);
});

test("busca filtra por cliente", () => {
  const credenciais = [credencial({ id: "1", cliente: "Boa Compra" }), credencial({ id: "2", cliente: "Outra Empresa" })];
  const grupos = agruparCredenciais(credenciais, "boa compra", HOJE, nomeSistema);
  expect(grupos.map((g) => g.cliente)).toEqual(["Boa Compra"]);
});

test("busca filtra por nome do sistema", () => {
  const credenciais = [credencial({ id: "1", cliente: "A", sistemaId: "g5" }), credencial({ id: "2", cliente: "B", sistemaId: "cloud" })];
  const grupos = agruparCredenciais(credenciais, "antares", HOJE, nomeSistema);
  expect(grupos.map((g) => g.cliente)).toEqual(["B"]);
});

test("busca filtra por link", () => {
  const credenciais = [
    credencial({ id: "1", cliente: "A", link: "https://a.example.com" }),
    credencial({ id: "2", cliente: "B", link: "https://outro.example.com" }),
  ];
  const grupos = agruparCredenciais(credenciais, "a.example", HOJE, nomeSistema);
  expect(grupos.map((g) => g.cliente)).toEqual(["A"]);
});

test("busca sem match devolve lista vazia", () => {
  expect(agruparCredenciais([credencial({})], "nao existe", HOJE, nomeSistema)).toEqual([]);
});
