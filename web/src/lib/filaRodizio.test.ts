import { test, expect } from "vitest";
import { filaRodizio } from "./filaRodizio";

test("comeca no proximo e da a volta na lista", () => {
  expect(filaRodizio(["Ana", "Bruno", "Carla", "Davi"], "Carla")).toEqual(["Carla", "Davi", "Ana", "Bruno"]);
});

test("proximo no inicio devolve a lista na mesma ordem", () => {
  expect(filaRodizio(["Ana", "Bruno", "Carla"], "Ana")).toEqual(["Ana", "Bruno", "Carla"]);
});

test("proximo no fim traz o resto antes dele", () => {
  expect(filaRodizio(["Ana", "Bruno", "Carla"], "Carla")).toEqual(["Carla", "Ana", "Bruno"]);
});

test("proximo fora da lista de ativos devolve so ele", () => {
  expect(filaRodizio(["Ana", "Bruno"], "Ferias")).toEqual(["Ferias"]);
});

test("proximo nulo devolve fila vazia", () => {
  expect(filaRodizio(["Ana", "Bruno"], null)).toEqual([]);
});

test("lista de ativos vazia devolve so o proximo", () => {
  expect(filaRodizio([], "Ana")).toEqual(["Ana"]);
});

test("um unico ativo devolve fila de um item", () => {
  expect(filaRodizio(["Ana"], "Ana")).toEqual(["Ana"]);
});
